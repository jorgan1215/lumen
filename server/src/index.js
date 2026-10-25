import express from 'express';
import cors from 'cors';
import { siteIdentity, validateSitePatch } from './site.js';
import { todayInZone, resolveAlbumDate } from './albumDate.js';
import { publicAIConfig, saveAIConfig, readAIConfig, generateAI, albumMessages, photoMessages, pickContext, ALBUM_FIELDS, PHOTO_FIELDS } from './ai.js';
import { downloadPhoto } from './download.js';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config, publicServerConfig, saveServerConfig } from './config.js';
import { db } from './db.js';
import { seedIfEmpty } from './seed.js';
import {
  qiniuConfigured, createUploadTicket, deleteQiniuObjects,
} from './qiniu.js';

seedIfEmpty();

const app = express();
// 部署在 Nginx 后面时，用真实客户端 IP 做解锁限流
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ---------- 工具 ----------

/** 把 null-prototype 行对象转成普通对象 */
const rows = (r) => r.map((x) => ({ ...x }));
const row = (r) => (r ? { ...r } : null);
const str = (v, fallback = '') => (typeof v === 'string' ? v : fallback);

/** 只接受 http(s) 或站内绝对路径的图片地址 */
function validUrl(u) {
  return typeof u === 'string' && /^(https?:\/\/|\/)[^\s]+$/i.test(u.trim());
}

/** 自定义相册 ID：字母数字、- 和 _，不能是纯数字（避免和自增 id 冲突） */
function validSlug(slug) {
  if (!slug) return true;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(slug)) return false;
  return !/^\d+$/.test(slug);
}

// ---------- 相册密码 ----------

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return true;
  const [algo, salt, hash] = String(stored).split(':');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(String(password ?? ''), salt, 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** 相册解锁凭证：只能访问这一本相册，不能当管理员 token 用 */
const albumToken = (albumId) => jwt.sign(
  { album: Number(albumId), scope: 'album' },
  config.jwtSecret,
  { expiresIn: '12h' },
);

function albumUnlocked(req, album) {
  if (!album.password_hash) return true;
  const token = String(req.headers['x-album-token'] || '');
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return payload?.scope === 'album' && Number(payload.album) === Number(album.id);
  } catch {
    return false;
  }
}

/** 解锁尝试限流，防止暴力猜密码 */
const unlockAttempts = new Map();
function tooManyAttempts(key) {
  const now = Date.now();
  const item = unlockAttempts.get(key);
  if (!item || item.resetAt < now) {
    unlockAttempts.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  item.count += 1;
  return item.count > 10;
}

// ---------- 鉴权 ----------

function isAdmin(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return payload?.sub === config.admin.username;
  } catch {
    return false;
  }
}

/** 管理接口：必须是管理员 token（相册解锁 token 不能当管理员用） */
function auth(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: '未登录或登录已过期' });
  next();
}

/** 去掉密码哈希，补上「是否加密」 */
function publicAlbum(album) {
  if (!album) return null;
  const { password_hash: hash, ...rest } = album;
  return { ...rest, locked: Boolean(hash), has_password: Boolean(hash) };
}

const findAlbum = (key) => row(
  db.prepare('SELECT * FROM albums WHERE id = ? OR slug = ?').get(key, key),
);

/** 拼出相册的公开地址标识：优先 slug，其次 id */
const albumKey = (album) => (album.slug ? album.slug : String(album.id));

/** 影集封面如果指向这张照片，删除/改地址后顺手修正封面 */
function syncCover(albumId, oldUrl, newUrl = '') {
  const album = db.prepare('SELECT id, cover_url FROM albums WHERE id = ?').get(albumId);
  if (!album || album.cover_url !== oldUrl) return;
  let cover = newUrl;
  if (!cover) {
    const next = db.prepare(
      'SELECT url FROM photos WHERE album_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC, id ASC LIMIT 1',
    ).get(albumId);
    cover = next?.url || '';
  }
  db.prepare('UPDATE albums SET cover_url = ? WHERE id = ?').run(cover, albumId);
}

/** 取照片上的七牛对象 key（原图 + 代理图），用于删除云端文件 */
function photoKeys(photo) {
  return [photo.qiniu_key, photo.proxy_key].filter(Boolean);
}

const albumExists = (id) => Boolean(db.prepare('SELECT id FROM albums WHERE id = ?').get(id));

// ---------- 站点设置（首页背景图等） ----------

function readSettings() {
  const out = {};
  for (const r of rows(db.prepare('SELECT key, value FROM settings').all())) out[r.key] = r.value;
  return out;
}

function writeSettings(patch) {
  const stmt = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  );
  for (const [key, value] of Object.entries(patch)) stmt.run(key, String(value ?? ''));
}

// ---------- 公开接口 ----------

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === config.admin.username && password === config.admin.password) {
    const token = jwt.sign({ sub: username }, config.jwtSecret, { expiresIn: config.jwtExpiresIn || '7d' });
    res.json({ token });
  } else {
    res.status(401).json({ error: '用户名或密码错误' });
  }
});

app.get('/api/site', (_req, res) => {
  const settings = readSettings();
  res.json({
    ...siteIdentity(settings),
    qiniuReady: qiniuConfigured(),
    heroImage: settings.hero_image || '',
    heroSlides: JSON.parse(settings.hero_slides || '[]'),
    heroInterval: Number(settings.hero_interval || 5),
    aboutTitle: settings.about_title || siteIdentity(settings).author,
    aboutBody: settings.about_body || '',
    aboutImage: settings.about_image || '',
    musicUrl: settings.music_url || '',
    musicVolume: Number(settings.music_volume ?? .25),
  });
});

/** 站点展示设置：按白名单写入 SQLite。 */
app.put('/api/admin/settings', auth, (req, res) => {
  const body = req.body || {};
  const patch = {};
  try { Object.assign(patch, validateSitePatch(body)); } catch(error) { return res.status(400).json({ error: error.message }); }
  if ('hero_image' in body) {
    const hero = str(body.hero_image).trim();
    if (hero && !validUrl(hero)) {
      return res.status(400).json({ error: '背景图地址不合法，需要以 http(s):// 开头' });
    }
    patch.hero_image = hero;
  }
  if ('hero_slides' in body) {
    if (!Array.isArray(body.hero_slides) || body.hero_slides.length > 100 || body.hero_slides.some(s => !s || !validUrl(s.url) || typeof s.caption !== 'string')) {
      return res.status(400).json({ error: '精选图需要有效图片地址和文案，最多 100 张' });
    }
    patch.hero_slides = JSON.stringify(body.hero_slides.map(s => ({ url: s.url.trim(), caption: s.caption.slice(0, 500), caption_en: str(s.caption_en).slice(0, 500) })));
  }
  if ('hero_interval' in body) {
    const seconds = Number(body.hero_interval);
    if (!Number.isFinite(seconds) || seconds < 2 || seconds > 120) return res.status(400).json({ error: '轮播间隔应为 2–120 秒' });
    patch.hero_interval = String(seconds);
  }
  for (const key of ['about_title', 'about_body', 'about_image']) {
    if (key in body) {
      if (typeof body[key] !== 'string' || body[key].length > 20000) return res.status(400).json({ error: '关于内容格式不正确' });
      if (key === 'about_image' && body[key] && !validUrl(body[key])) return res.status(400).json({ error: '关于图片地址不正确' });
      patch[key] = body[key];
    }
  }
  if ('music_url' in body) {
    if (typeof body.music_url !== 'string' || body.music_url.length > 4000 || (body.music_url && !validUrl(body.music_url))) return res.status(400).json({ error: '请填写有效的背景音乐 URL' });
    patch.music_url = body.music_url.trim();
  }
  if ('music_volume' in body) {
    const volume = Number(body.music_volume);
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) return res.status(400).json({ error: '音乐音量需要在 0–100% 之间' });
    patch.music_volume = String(volume);
  }
  if (!Object.keys(patch).length) return res.status(400).json({ error: '没有需要保存的设置' });
  writeSettings(patch);
  res.json({ ok: true, ...readSettings() });
});

// AI configuration is deliberately separate from public site settings.
app.get('/api/admin/config', auth, (_req, res) => res.json(publicServerConfig()));
app.put('/api/admin/config', auth, (req, res) => {
  try { res.json(saveServerConfig(req.body || {})); }
  catch (error) { res.status(400).json({ error: error.code ? '配置文件保存失败，请检查服务端文件权限' : error.message }); }
});

app.get('/api/admin/ai/config', auth, (_req, res) => res.json(publicAIConfig()));
app.put('/api/admin/ai/config', auth, (req, res) => {
  try { res.json(saveAIConfig(req.body || {})); }
  catch { res.status(400).json({ error: '配置无效或无法保存，请检查 HTTPS API 地址、模型 ID 和密钥格式' }); }
});
let aiBusy = false;
async function withAI(res, work) {
  if (aiBusy) return res.status(429).json({ error: '已有 AI 任务正在生成，请稍候' });
  aiBusy = true;
  try { res.json(await work()); }
  catch (error) { res.status(502).json({ error: error.message || 'AI 生成失败' }); }
  finally { aiBusy = false; }
}
app.post('/api/admin/ai/album', auth, (req, res) => {
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  if (!description || description.length > 8000) return res.status(400).json({ error: '请输入 1–8000 字的相册创作描述' });
  return withAI(res, async () => {
    const context = pickContext(req.body.album, ALBUM_FIELDS);
    const identity = siteIdentity(readSettings());
    const today = todayInZone(identity.timeZone);
    const result = await generateAI(albumMessages(description, context, today, identity.timeZone), ALBUM_FIELDS);
    result.shot_at = resolveAlbumDate(description, result.shot_at, today);
    result.cover_url = context.cover_url;
    const base = result.slug;
    let suffix = 2;
    while (db.prepare('SELECT id FROM albums WHERE slug = ?').get(result.slug)) result.slug = `${base.slice(0, 55)}-${suffix++}`;
    return result;
  });
});
app.post('/api/admin/ai/photos/:id', auth, (req, res) => {
  const photo = row(db.prepare('SELECT * FROM photos WHERE id = ? AND deleted_at IS NULL').get(req.params.id));
  if (!photo) return res.status(404).json({ error: '照片不存在' });
  const album = row(db.prepare('SELECT * FROM albums WHERE id = ?').get(photo.album_id));
  return withAI(res, async () => {
    const options = readAIConfig();
    if (!options.vision) throw new Error('照片文案需要支持图片输入的视觉模型，请在配置中启用视觉能力');
    const metadata = { ...photo, ...pickContext({ ...photo, ...(req.body?.photo || {}) }, [...PHOTO_FIELDS,'aperture','shutter','iso','focal_length','camera','lens','author','taken_at']) };
    const context = req.body?.album ? pickContext(req.body.album, ALBUM_FIELDS) : album;
    return generateAI(photoMessages(context, metadata), PHOTO_FIELDS, options);
  });
});

app.get('/api/albums', (_req, res) => {
  const list = rows(db.prepare(`
    SELECT a.id, a.title, a.subtitle, a.title_en, a.description, a.description_en,
      a.location, a.location_en, a.cover_url, a.slug, a.shot_at, a.sort_order, a.created_at,
      (a.password_hash <> '') AS locked,
      (SELECT COUNT(*) FROM photos p WHERE p.album_id = a.id AND p.deleted_at IS NULL) AS photo_count,
      (SELECT COUNT(*) FROM photos p WHERE p.album_id = a.id AND p.deleted_at IS NOT NULL) AS trash_count,
      (SELECT p.proxy_url FROM photos p
        WHERE p.album_id = a.id AND p.url = a.cover_url AND p.deleted_at IS NULL
        LIMIT 1) AS cover_proxy_url
    FROM albums a ORDER BY a.sort_order ASC, a.id DESC
  `).all()).map((a) => ({ ...a, locked: Boolean(a.locked), key: albumKey(a) }));
  res.json(list);
});

app.get('/api/albums/:key', (req, res) => {
  const album = findAlbum(req.params.key);
  if (!album) return res.status(404).json({ error: '影集不存在' });

  // 加密相册：没解锁时只返回标题等基本信息，不下发照片
  if (album.password_hash && !isAdmin(req) && !albumUnlocked(req, album)) {
    return res.json({
      id: album.id,
      key: albumKey(album),
      slug: album.slug,
      title: album.title,
      title_en: album.title_en,
      subtitle: album.subtitle,
      locked: true,
      has_password: true,
      photos: [],
    });
  }

  const photos = rows(db.prepare(
    'SELECT * FROM photos WHERE album_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC, id ASC',
  ).all(album.id));
  // 能走到这里说明已经放行（公开相册 / 管理员 / 已解锁），locked 只表示「是否需要密码」
  res.json({ ...publicAlbum(album), locked: false, key: albumKey(album), photos });
});

app.post('/api/albums/:key/unlock', (req, res) => {
  const album = findAlbum(req.params.key);
  if (!album) return res.status(404).json({ error: '影集不存在' });
  if (!album.password_hash) return res.json({ token: '' });

  const limiterKey = `${req.ip}:${album.id}`;
  if (tooManyAttempts(limiterKey)) {
    return res.status(429).json({ error: '尝试次数过多，请稍后再试' });
  }
  if (!verifyPassword(req.body?.password, album.password_hash)) {
    return res.status(401).json({ error: '密码不对' });
  }
  unlockAttempts.delete(limiterKey);
  res.json({ token: albumToken(album.id) });
});

app.get('/api/photos/:id/download', async (req, res) => {
  const photo = row(db.prepare('SELECT * FROM photos WHERE id = ? AND deleted_at IS NULL').get(req.params.id));
  if (!photo) return res.status(404).json({ error: '照片不存在' });
  const album = row(db.prepare('SELECT * FROM albums WHERE id = ?').get(photo.album_id));
  if (!album || (!isAdmin(req) && !albumUnlocked(req, album))) return res.status(403).json({ error: '请先解锁影集' });
  try { await downloadPhoto(photo, res); }
  catch (error) { if (!res.headersSent) res.status(502).json({ error: '暂时无法下载，请稍后重试' }); else res.destroy(); }
});

// ---------- 上传凭证 ----------

app.get('/api/admin/upload-ticket', auth, (req, res) => {
  if (!qiniuConfigured()) {
    return res.status(500).json({ error: '七牛云未配置，请填写 server/config.json' });
  }
  res.json(createUploadTicket(String(req.query.filename || 'photo.jpg')));
});

// 兼容旧接口：只签发原图凭证
app.get('/api/admin/upload-token', auth, (req, res) => {
  if (!qiniuConfigured()) {
    return res.status(500).json({ error: '七牛云未配置，请填写 server/config.json' });
  }
  const ticket = createUploadTicket(String(req.query.filename || 'photo.jpg'));
  res.json({ token: ticket.original.token, key: ticket.original.key, domain: ticket.domain });
});

// ---------- 影集管理 ----------

app.post('/api/admin/albums', auth, (req, res) => {
  const body = req.body || {};
  const title = str(body.title);
  if (!title.trim()) return res.status(400).json({ error: '影集标题不能为空' });

  const slug = str(body.slug).trim();
  if (!validSlug(slug)) return res.status(400).json({ error: '自定义 ID 只能包含字母、数字、- 和 _，且不能是纯数字' });
  if (slug && db.prepare('SELECT id FROM albums WHERE slug = ?').get(slug)) {
    return res.status(409).json({ error: '这个自定义 ID 已经被占用了' });
  }

  const password = str(body.password);
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM albums').get().m;
  const info = db.prepare(`
    INSERT INTO albums (title, subtitle, description, cover_url, location, shot_at, sort_order,
      slug, password_hash, title_en, description_en, location_en)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(), str(body.subtitle), str(body.description), str(body.cover_url),
    str(body.location), str(body.shot_at), Number(max) + 1,
    slug, password ? hashPassword(password) : '',
    str(body.title_en), str(body.description_en), str(body.location_en),
  );
  res.json(publicAlbum(row(db.prepare('SELECT * FROM albums WHERE id = ?').get(info.lastInsertRowid))));
});

app.put('/api/admin/albums/:id', auth, (req, res) => {
  const exist = row(db.prepare('SELECT * FROM albums WHERE id = ?').get(req.params.id));
  if (!exist) return res.status(404).json({ error: '影集不存在' });
  const body = req.body || {};

  const slug = 'slug' in body ? str(body.slug).trim() : exist.slug;
  if (!validSlug(slug)) return res.status(400).json({ error: '自定义 ID 只能包含字母、数字、- 和 _，且不能是纯数字' });
  if (slug) {
    const clash = db.prepare('SELECT id FROM albums WHERE slug = ? AND id <> ?').get(slug, exist.id);
    if (clash) return res.status(409).json({ error: '这个自定义 ID 已经被占用了' });
  }

  // 密码：clear_password 清空；password 非空则重设；否则保持原样
  let passwordHash = exist.password_hash;
  if (body.clear_password) passwordHash = '';
  else if (typeof body.password === 'string' && body.password) passwordHash = hashPassword(body.password);

  const value = (key) => (key in body ? str(body[key], exist[key]) : exist[key]);
  db.prepare(`
    UPDATE albums SET title = ?, subtitle = ?, description = ?, cover_url = ?, location = ?, shot_at = ?,
      sort_order = ?, slug = ?, password_hash = ?, title_en = ?, description_en = ?, location_en = ?
    WHERE id = ?
  `).run(
    value('title'), value('subtitle'), value('description'), value('cover_url'),
    value('location'), value('shot_at'), Number(body.sort_order ?? exist.sort_order),
    slug, passwordHash,
    value('title_en'), value('description_en'), value('location_en'),
    exist.id,
  );
  res.json(publicAlbum(row(db.prepare('SELECT * FROM albums WHERE id = ?').get(exist.id))));
});

/** 拖动排序相册（放在 /albums/:id 之外，避免被当成 id） */
app.put('/api/admin/reorder/albums', auth, (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
  if (!ids.length) return res.status(400).json({ error: '缺少排序列表' });
  const update = db.prepare('UPDATE albums SET sort_order = ? WHERE id = ?');
  ids.forEach((id, index) => update.run(index, id));
  res.json({ ok: true, ids });
});

/**
 * 删除影集：连同照片记录和七牛云文件一起永久删除。
 * 单张照片的删除走「回收站」，这里为了不留下孤儿文件只能直删。
 */
app.delete('/api/admin/albums/:id', auth, async (req, res) => {
  const photos = rows(db.prepare('SELECT qiniu_key, proxy_key FROM photos WHERE album_id = ?').all(req.params.id));
  const info = db.prepare('DELETE FROM albums WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: '影集不存在' });
  const files = await deleteQiniuObjects(photos.flatMap(photoKeys)).catch((e) => {
    console.error('[qiniu] 删除失败', e);
    return { deleted: 0 };
  });
  res.json({ deleted: true, files: files.deleted ?? 0 });
});

// ---------- 照片管理 ----------

app.post('/api/admin/photos', auth, (req, res) => {
  const {
    album_id, url, proxy_url = '', qiniu_key = '', proxy_key = '',
    title = '', title_en = '', description = '', description_en = '',
    aperture = '', shutter = '', iso = '', focal_length = '', camera = '', lens = '', author = '',
    taken_at = '', width = 0, height = 0,
  } = req.body || {};
  if (!album_id || !url) return res.status(400).json({ error: '缺少 album_id 或 url' });
  if (!validUrl(url)) return res.status(400).json({ error: '图片地址不合法，需要以 http(s):// 开头' });
  if (!albumExists(album_id)) return res.status(404).json({ error: '影集不存在' });

  const max = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM photos WHERE album_id = ?').get(album_id).m;
  const info = db.prepare(`
    INSERT INTO photos (
      album_id, url, proxy_url, qiniu_key, proxy_key, title, title_en, description, description_en,
      aperture, shutter, iso, focal_length, camera, lens, author, taken_at, width, height, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    album_id, url.trim(), str(proxy_url), str(qiniu_key), str(proxy_key),
    str(title), str(title_en), str(description), str(description_en),
    str(aperture), str(shutter), str(iso), str(focal_length),
    str(camera), str(lens), str(author), str(taken_at),
    Number(width) || 0, Number(height) || 0, Number(max) + 1,
  );
  res.json(row(db.prepare('SELECT * FROM photos WHERE id = ?').get(info.lastInsertRowid)));
});

app.put('/api/admin/photos/:id', auth, (req, res) => {
  const exist = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (!exist) return res.status(404).json({ error: '照片不存在' });
  const body = req.body || {};

  // 只更新请求里出现的字段，未传的保持原值
  const pick = (key, fallback) => (key in body ? str(body[key], fallback) : fallback);
  const url = pick('url', exist.url);
  if (!validUrl(url)) return res.status(400).json({ error: '图片地址不合法，需要以 http(s):// 开头' });

  const next = {
    url,
    proxy_url: pick('proxy_url', exist.proxy_url),
    qiniu_key: pick('qiniu_key', exist.qiniu_key),
    proxy_key: pick('proxy_key', exist.proxy_key),
    title: pick('title', exist.title),
    title_en: pick('title_en', exist.title_en),
    description: pick('description', exist.description),
    description_en: pick('description_en', exist.description_en),
    aperture: pick('aperture', exist.aperture),
    shutter: pick('shutter', exist.shutter),
    iso: pick('iso', exist.iso),
    focal_length: pick('focal_length', exist.focal_length),
    camera: pick('camera', exist.camera),
    lens: pick('lens', exist.lens),
    author: pick('author', exist.author),
    taken_at: pick('taken_at', exist.taken_at),
    width: 'width' in body ? Number(body.width) || 0 : exist.width,
    height: 'height' in body ? Number(body.height) || 0 : exist.height,
  };

  db.prepare(`
    UPDATE photos SET url = ?, proxy_url = ?, qiniu_key = ?, proxy_key = ?, title = ?, title_en = ?,
      description = ?, description_en = ?, aperture = ?, shutter = ?, iso = ?, focal_length = ?,
      camera = ?, lens = ?, author = ?, taken_at = ?, width = ?, height = ?
    WHERE id = ?
  `).run(
    next.url, next.proxy_url, next.qiniu_key, next.proxy_key, next.title, next.title_en,
    next.description, next.description_en, next.aperture, next.shutter, next.iso, next.focal_length,
    next.camera, next.lens, next.author, next.taken_at, next.width, next.height, req.params.id,
  );

  if (next.url !== exist.url) syncCover(exist.album_id, exist.url, next.url);
  res.json(row(db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id)));
});

/** 拖动排序照片（同样避开 /photos/:id） */
app.put('/api/admin/reorder/photos', auth, (req, res) => {
  const albumId = Number(req.body?.album_id);
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
  if (!albumId || !ids.length) return res.status(400).json({ error: '缺少 album_id 或排序列表' });
  const owned = new Set(rows(db.prepare('SELECT id FROM photos WHERE album_id = ?').all(albumId)).map((p) => p.id));
  if (ids.some((id) => !owned.has(id))) return res.status(400).json({ error: '排序列表里有不属于该影集的照片' });
  const update = db.prepare('UPDATE photos SET sort_order = ? WHERE id = ?');
  ids.forEach((id, index) => update.run(index, id));
  res.json({ ok: true, ids });
});

/** 删除照片 = 移入回收站（七牛文件暂时保留，清空回收站时才真正删除） */
app.delete('/api/admin/photos/:id', auth, (req, res) => {
  const photo = row(db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id));
  if (!photo) return res.status(404).json({ error: '照片不存在' });
  if (photo.deleted_at) return res.json({ deleted: false, trashed: true });

  db.prepare("UPDATE photos SET deleted_at = datetime('now', 'localtime') WHERE id = ?").run(req.params.id);
  syncCover(photo.album_id, photo.url);
  res.json({ deleted: true, trashed: true });
});

// ---------- 回收站 ----------

app.get('/api/admin/trash', auth, (_req, res) => {
  const list = rows(db.prepare(`
    SELECT p.*, a.title AS album_title
    FROM photos p LEFT JOIN albums a ON a.id = p.album_id
    WHERE p.deleted_at IS NOT NULL
    ORDER BY p.deleted_at DESC, p.id DESC
  `).all());
  res.json(list);
});

app.post('/api/admin/photos/:id/restore', auth, (req, res) => {
  const photo = row(db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id));
  if (!photo) return res.status(404).json({ error: '照片不存在' });
  if (!photo.deleted_at) return res.json({ restored: false, photo });
  db.prepare('UPDATE photos SET deleted_at = NULL WHERE id = ?').run(req.params.id);
  // 影集没有封面时，恢复的照片优先补位
  const album = db.prepare('SELECT cover_url FROM albums WHERE id = ?').get(photo.album_id);
  if (album && !album.cover_url) {
    db.prepare('UPDATE albums SET cover_url = ? WHERE id = ?').run(photo.url, photo.album_id);
  }
  res.json({ restored: true, photo: row(db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id)) });
});

/** 彻底删除单张（仅限回收站里的） */
app.delete('/api/admin/trash/:id', auth, async (req, res) => {
  const photo = row(db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id));
  if (!photo) return res.status(404).json({ error: '照片不存在' });
  if (!photo.deleted_at) return res.status(400).json({ error: '照片不在回收站中' });
  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  const files = await deleteQiniuObjects(photoKeys(photo)).catch((e) => {
    console.error('[qiniu] 删除失败', e);
    return { deleted: 0 };
  });
  res.json({ deleted: true, files: files.deleted ?? 0 });
});

/** 清空回收站：数据库记录和七牛云文件一起删除 */
app.delete('/api/admin/trash', auth, async (_req, res) => {
  const photos = rows(db.prepare('SELECT qiniu_key, proxy_key FROM photos WHERE deleted_at IS NOT NULL').all());
  const info = db.prepare('DELETE FROM photos WHERE deleted_at IS NOT NULL').run();
  const files = await deleteQiniuObjects(photos.flatMap(photoKeys)).catch((e) => {
    console.error('[qiniu] 删除失败', e);
    return { deleted: 0 };
  });
  res.json({ deleted: info.changes, files: files.deleted ?? 0 });
});

// 统一错误处理
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(config.port, () => {
  console.log(`[lumen] API 服务已启动: http://localhost:${config.port}`);
  if (!qiniuConfigured()) {
    console.warn('[lumen] 七牛云尚未配置（server/config.json），上传功能暂不可用，展示功能正常。');
  }
});
