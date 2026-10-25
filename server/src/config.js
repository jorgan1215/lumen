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
