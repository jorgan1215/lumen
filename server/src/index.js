import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import qiniu from 'qiniu';
import { config } from './config.js';
import { db } from './db.js';
import { seedIfEmpty } from './seed.js';

seedIfEmpty();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ---------- 工具 ----------

/** 把 null-prototype 行对象转成普通对象 */
const rows = (r) => r.map((x) => ({ ...x }));
const row = (r) => (r ? { ...r } : null);

function qiniuConfigured() {
  const q = config.qiniu || {};
  return q.accessKey && !q.accessKey.startsWith('YOUR_') && q.secretKey && !q.secretKey.startsWith('YOUR_')
    && q.bucket && !q.bucket.startsWith('your-') && q.domain && !q.domain.includes('example.com');
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: '未登录或登录已过期' });
  }
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
  res.json({
    name: 'LUMEN',
    qiniuReady: qiniuConfigured(),
  });
});

app.get('/api/albums', (_req, res) => {
  const list = rows(db.prepare(`
    SELECT a.*, (SELECT COUNT(*) FROM photos p WHERE p.album_id = a.id) AS photo_count
    FROM albums a ORDER BY a.sort_order ASC, a.id DESC
  `).all());
  res.json(list);
});

app.get('/api/albums/:id', (req, res) => {
  const album = row(db.prepare('SELECT * FROM albums WHERE id = ?').get(req.params.id));
  if (!album) return res.status(404).json({ error: '影集不存在' });
  const photos = rows(db.prepare(
    'SELECT * FROM photos WHERE album_id = ? ORDER BY sort_order ASC, id ASC',
  ).all(req.params.id));
  res.json({ ...album, photos });
});

// ---------- 管理接口（需登录） ----------

app.get('/api/admin/upload-token', auth, (req, res) => {
  if (!qiniuConfigured()) {
    return res.status(500).json({ error: '七牛云未配置，请填写 server/config.json' });
  }
  const filename = String(req.query.filename || 'photo.jpg');
  const ext = (filename.match(/\.[a-zA-Z0-9]+$/)?.[0] || '.jpg').toLowerCase();
  const key = `${config.qiniu.prefix || ''}${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;

  const mac = new qiniu.auth.digest.Mac(config.qiniu.accessKey, config.qiniu.secretKey);
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: `${config.qiniu.bucket}:${key}`,
    expires: Number(config.uploadTokenExpires || 3600),
  });
  const token = putPolicy.uploadToken(mac);
  res.json({ token, key, domain: config.qiniu.domain.replace(/\/$/, '') });
});

app.post('/api/admin/albums', auth, (req, res) => {
  const { title = '', subtitle = '', description = '', cover_url = '', location = '', shot_at = '' } = req.body || {};
  if (!title.trim()) return res.status(400).json({ error: '影集标题不能为空' });
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM albums').get().m;
  const info = db.prepare(`
    INSERT INTO albums (title, subtitle, description, cover_url, location, shot_at, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title.trim(), subtitle, description, cover_url, location, shot_at, Number(max) + 1);
  res.json(row(db.prepare('SELECT * FROM albums WHERE id = ?').get(info.lastInsertRowid)));
});

app.put('/api/admin/albums/:id', auth, (req, res) => {
  const exist = db.prepare('SELECT id FROM albums WHERE id = ?').get(req.params.id);
  if (!exist) return res.status(404).json({ error: '影集不存在' });
  const { title, subtitle, description, cover_url, location, shot_at, sort_order } = req.body || {};
  db.prepare(`
    UPDATE albums SET title = ?, subtitle = ?, description = ?, cover_url = ?, location = ?, shot_at = ?, sort_order = ?
    WHERE id = ?
  `).run(title ?? '', subtitle ?? '', description ?? '', cover_url ?? '', location ?? '', shot_at ?? '', Number(sort_order ?? 0), req.params.id);
  res.json(row(db.prepare('SELECT * FROM albums WHERE id = ?').get(req.params.id)));
});

app.delete('/api/admin/albums/:id', auth, (req, res) => {
  const info = db.prepare('DELETE FROM albums WHERE id = ?').run(req.params.id);
  res.json({ deleted: info.changes > 0 });
});

app.post('/api/admin/photos', auth, (req, res) => {
  const {
    album_id, url, qiniu_key = '', title = '', description = '',
    aperture = '', shutter = '', iso = '', focal_length = '', camera = '',
    taken_at = '', width = 0, height = 0,
  } = req.body || {};
  if (!album_id || !url) return res.status(400).json({ error: '缺少 album_id 或 url' });
  if (!db.prepare('SELECT id FROM albums WHERE id = ?').get(album_id)) {
    return res.status(404).json({ error: '影集不存在' });
  }
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM photos WHERE album_id = ?').get(album_id).m;
  const info = db.prepare(`
    INSERT INTO photos (album_id, url, qiniu_key, title, description, aperture, shutter, iso, focal_length, camera, taken_at, width, height, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(album_id, url, qiniu_key, title, description, aperture, shutter, iso, focal_length, camera, taken_at,
    Number(width) || 0, Number(height) || 0, Number(max) + 1);
  res.json(row(db.prepare('SELECT * FROM photos WHERE id = ?').get(info.lastInsertRowid)));
});

app.put('/api/admin/photos/:id', auth, (req, res) => {
  const exist = db.prepare('SELECT id FROM photos WHERE id = ?').get(req.params.id);
  if (!exist) return res.status(404).json({ error: '照片不存在' });
  const { title, description, aperture, shutter, iso, focal_length, camera, taken_at } = req.body || {};
  db.prepare(`
    UPDATE photos SET title = ?, description = ?, aperture = ?, shutter = ?, iso = ?, focal_length = ?, camera = ?, taken_at = ?
    WHERE id = ?
  `).run(title ?? '', description ?? '', aperture ?? '', shutter ?? '', iso ?? '', focal_length ?? '', camera ?? '', taken_at ?? '', req.params.id);
  res.json(row(db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id)));
});

app.delete('/api/admin/photos/:id', auth, (req, res) => {
  const info = db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  res.json({ deleted: info.changes > 0 });
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
