import qiniu from 'qiniu';
import { config } from './config.js';

/** 七牛配置是否可用（config.json 里的占位值不算） */
export function qiniuConfigured() {
  const q = config.qiniu || {};
  return Boolean(
    q.accessKey && !q.accessKey.startsWith('YOUR_')
    && q.secretKey && !q.secretKey.startsWith('YOUR_')
    && q.bucket && !q.bucket.startsWith('your-')
    && q.domain && !q.domain.includes('example.com'),
  );
}

/** 去掉首尾斜杠，得到干净的目录前缀 */
function prefix() {
  return String(config.qiniu?.prefix || '').replace(/^\/+|\/+$/g, '');
}

/** 拼出对象 key，例如 albums/1730000000-ab12cd34.jpg */
export function objectKey(name) {
  const p = prefix();
  return p ? `${p}/${name}` : name;
}

/** 由 key 生成公开访问地址 */
export function publicUrl(key) {
  const domain = String(config.qiniu?.domain || '').replace(/\/+$/, '');
  return `${domain}/${String(key).replace(/^\/+/, '')}`;
}

const SAFE_EXT = /^\.[a-z0-9]{1,8}$/;

function randomName(filename) {
  const ext = (String(filename).match(/\.[a-zA-Z0-9]+$/)?.[0] || '.jpg').toLowerCase();
  const safeExt = SAFE_EXT.test(ext) ? ext : '.jpg';
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}${rand}${safeExt}`;
}

/**
 * 一次上传同时签发「原图」和「代理图」两个凭证，前端拿到后各传一次。
 * 代理图放在 proxy/ 子目录下，key 与原图一一对应，方便删除时一并清理。
 */
export function createUploadTicket(filename) {
  const mac = new qiniu.auth.digest.Mac(config.qiniu.accessKey, config.qiniu.secretKey);
  const make = (key) => {
    const putPolicy = new qiniu.rs.PutPolicy({
      scope: `${config.qiniu.bucket}:${key}`,
      expires: Number(config.uploadTokenExpires || 3600),
    });
    return { token: putPolicy.uploadToken(mac), key, url: publicUrl(key) };
  };

  const name = randomName(filename);
  const original = make(objectKey(name));
  const proxy = make(objectKey(`proxy/${name}`));

  return {
    domain: publicUrl('').replace(/\/$/, ''),
    original,
    proxy,
  };
}

/**
 * 删除七牛上的对象（用于清空回收站 / 删除影集）。
 * 单批最多 1000 个，失败时退化为逐个删除；文件本来就不存在（612）视为成功。
 */
export async function deleteQiniuObjects(keys) {
  const list = [...new Set((keys || []).filter(Boolean))];
  if (!list.length || !qiniuConfigured()) return { deleted: 0, keys: list };

  const mac = new qiniu.auth.digest.Mac(config.qiniu.accessKey, config.qiniu.secretKey);
  const bucket = config.qiniu.bucket;
  const conf = new qiniu.conf.Config();
  const manager = new qiniu.rs.BucketManager(mac, conf);

  const batchDelete = (chunk) => new Promise((resolve) => {
    const ops = chunk.map((key) => qiniu.rs.deleteOp(bucket, key));
    manager.batch(ops, (err, body) => {
      if (err) return resolve({ ok: false, body: null });
      resolve({ ok: true, body });
    });
  });

  const singleDelete = (key) => new Promise((resolve) => {
    manager.delete(bucket, key, (err, _body, info) => {
      // 612: no such file —— 目标本来就没有，忽略
      const code = info?.statusCode;
      resolve(!err && (code === 200 || code === 612 || code === 404));
    });
  });

  let done = 0;
  for (let i = 0; i < list.length; i += 1000) {
    const chunk = list.slice(i, i + 1000);
    const res = await batchDelete(chunk);
    if (res.ok && Array.isArray(res.body)) {
      done += res.body.filter((r) => r?.code === 200 || r?.code === 612 || r?.code === 404).length;
      continue;
    }
    for (const key of chunk) {
      if (await singleDelete(key)) done += 1;
    }
  }
  return { deleted: done, keys: list };
}

/** 单条删除的便捷包装 */
export async function deleteQiniuObject(key) {
  if (!key) return false;
  const { deleted } = await deleteQiniuObjects([key]);
  return deleted > 0;
}
