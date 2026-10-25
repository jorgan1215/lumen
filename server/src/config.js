import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examplePath = path.join(serverRoot, 'config.example.json');
const configPath = path.join(serverRoot, 'config.json');

if (!fs.existsSync(configPath)) {
  fs.copyFileSync(examplePath, configPath);
  console.warn('[config] 未找到 server/config.json，已从 config.example.json 复制模板。请填写七牛云密钥与管理员密码后再上传照片。');
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// 环境变量可覆盖端口（便于 PM2 / Docker 部署）
config.port = Number(process.env.PORT || config.port || 3001);

export { config, serverRoot, configPath };

/** 管理端只返回非敏感值及密钥是否已配置；空白密钥字段表示保留。 */
export function publicServerConfig() {
  const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const q = saved.qiniu || {};
  return { port: saved.port || 3001, activePort: config.port, jwtExpiresIn: saved.jwtExpiresIn || '7d', uploadTokenExpires: saved.uploadTokenExpires || 3600,
    admin: { username: saved.admin?.username || '', hasPassword: Boolean(saved.admin?.password) }, hasJwtSecret: Boolean(saved.jwtSecret),
    qiniu: { bucket: q.bucket || '', domain: q.domain || '', prefix: q.prefix || '', hasAccessKey: Boolean(q.accessKey), hasSecretKey: Boolean(q.secretKey) } };
}
export function saveServerConfig(body) {
  const previous = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const next = { ...previous, admin: { ...previous.admin }, qiniu: { ...previous.qiniu } };
  const text = (value, max = 1000) => { if (typeof value !== 'string' || value.length > max || /[\r\n\0]/.test(value)) throw new Error('配置字段格式不正确'); return value.trim(); };
  const number = (value, min, max) => { const n = Number(value); if (!Number.isInteger(n) || n < min || n > max) throw new Error(`数值范围应为 ${min}–${max}`); return n; };
  if ('port' in body) next.port = number(body.port, 1, 65535);
  if ('uploadTokenExpires' in body) next.uploadTokenExpires = number(body.uploadTokenExpires, 60, 604800);
  if ('jwtExpiresIn' in body) { next.jwtExpiresIn = text(body.jwtExpiresIn, 30); if (!/^\d+(?:s|m|h|d)$/.test(next.jwtExpiresIn) || Number.parseInt(next.jwtExpiresIn) < 1) throw new Error('登录有效期请使用 30m、12h 或 7d 等格式'); }
  if (body.admin && typeof body.admin === 'object') {
    if ('username' in body.admin) { next.admin.username = text(body.admin.username, 100); if (!next.admin.username) throw new Error('管理员用户名不能为空'); }
    if (body.admin.password) { const password = text(body.admin.password); if (password.length < 8) throw new Error('管理员密码至少需要 8 位'); next.admin.password = password; }
  }
  if (body.jwtSecret) { const secret = text(body.jwtSecret); if (secret.length < 32) throw new Error('JWT 签名密钥至少需要 32 位'); next.jwtSecret = secret; }
  if (body.qiniu && typeof body.qiniu === 'object') {
    for (const key of ['bucket','domain','prefix']) if (key in body.qiniu) next.qiniu[key] = text(body.qiniu[key], 2000);
    if (next.qiniu.domain) { let url; try { url = new URL(next.qiniu.domain); } catch { throw new Error('七牛访问域名需要有效的 HTTP(S) 地址'); } if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('七牛访问域名格式不正确'); next.qiniu.domain = next.qiniu.domain.replace(/\/+$/, ''); }
    next.qiniu.prefix = (next.qiniu.prefix || '').replace(/^\/+|\/+$/g, '');
    for (const key of ['accessKey','secretKey']) if (body.qiniu[key]) next.qiniu[key] = text(body.qiniu[key]);
  }
  const requiresLogin = next.admin.username !== previous.admin?.username || next.admin.password !== previous.admin?.password || next.jwtSecret !== previous.jwtSecret;
  const temporary = `${configPath}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(next, null, 2)+'\n', { mode: 0o600 });
  fs.chmodSync(temporary, 0o600); fs.renameSync(temporary, configPath);
  // 端口在下次启动时应用，其余配置立即生效。
  const activePort = config.port;
  Object.assign(config, next, { port: activePort });
  return { ...publicServerConfig(), requiresLogin, requiresRestart: Number(next.port) !== activePort && !process.env.PORT };
}
