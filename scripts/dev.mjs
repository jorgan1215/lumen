// 本地开发启动脚本：同时启动后端 API (3001) 和前端 Vite dev server。
// 命令行参数（如 --port 8080 --host）会透传给 Vite。
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(root, 'client', 'node_modules', 'vite', 'bin', 'vite.js');

const server = spawn(process.execPath, [path.join(root, 'server', 'src', 'index.js')], {
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.API_PORT || '3001' },
});

const client = spawn(process.execPath, [viteBin, ...process.argv.slice(2)], {
  cwd: path.join(root, 'client'),
  stdio: 'inherit',
  env: { ...process.env, VITE_API_TARGET: `http://localhost:${process.env.API_PORT || 3001}` },
});

function shutdown() {
  server.kill();
  client.kill();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.on('exit', (code) => { if (code) { client.kill(); process.exit(code); } });
client.on('exit', (code) => { if (code) { server.kill(); process.exit(code); } });
