#!/usr/bin/env bash
# LUMEN 摄影网站 —— 服务器首次部署脚本
# 用法（在服务器上执行）：
#   APP_DIR=/var/www/lumen DOMAIN=your-domain.com bash deploy/setup.sh
#
# 前置条件：
#   1. 代码已上传到 $APP_DIR
#   2. 已用 root 或具有 sudo 权限的用户登录
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/lumen}"
DOMAIN="${DOMAIN:-your-domain.com}"

echo "=============================================="
echo " LUMEN 首次部署"
echo " 目录: $APP_DIR"
echo "=============================================="

# ---------- 1. 检查 Node（后端用了 node:sqlite，必须 >= 22.5） ----------
NODE_VER="$(node -v 2>/dev/null | sed 's/^v//' || echo '0')"
if [ "$(printf '%s\n' "22.5.0" "$NODE_VER" | sort -V | head -n1)" != "22.5.0" ]; then
  echo "[×] 需要 Node >= 22.5，当前: ${NODE_VER:-未安装}"
  echo "    推荐用 nvm 安装（无需 sudo）："
  echo "      curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
  echo "      source ~/.bashrc && nvm install 22 && nvm alias default 22"
  echo "    或用 NodeSource（Ubuntu/Debian）："
  echo "      curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
  exit 1
fi
echo "[√] Node v${NODE_VER}"

cd "$APP_DIR"

# ---------- 2. 安装依赖 ----------
echo "[1/5] 安装前后端依赖..."
npm run setup

# ---------- 3. 配置检查 ----------
echo "[2/5] 检查 server/config.json ..."
if [ ! -f server/config.json ]; then
  cp server/config.example.json server/config.json
  echo "[!] 已生成 server/config.json，请先填写后再继续："
  echo "    vim $APP_DIR/server/config.json"
  echo "    必填：jwtSecret、admin.password、qiniu 的 accessKey/secretKey/bucket/domain"
  exit 0
fi
if grep -q 'YOUR_QINIU_ACCESS_KEY\|请替换' server/config.json; then
  echo "[!] config.json 里还有占位符，请先填写真实值：vim $APP_DIR/server/config.json"
  exit 0
fi
echo "[√] 配置已就绪"

# ---------- 4. 构建前端 ----------
echo "[3/5] 构建前端..."
npm run build
echo "[√] 产物在 $APP_DIR/client/dist"

# ---------- 5. PM2 启动后端 ----------
echo "[4/5] 启动后端服务..."
if ! command -v pm2 >/dev/null 2>&1; then
  echo "     安装 pm2..."
  npm install -g pm2
fi
pm2 start ecosystem.config.js --update-env || pm2 restart lumen-api --update-env
pm2 save
echo "     配置开机自启（按提示执行 pm2 startup 输出的那条 sudo 命令）："
pm2 startup || true

# ---------- 6. 提示 Nginx 与证书 ----------
echo "[5/5] 后续手动步骤："
echo "  ① certbot 申请证书（先确保域名已解析到本机、80 端口已放行）："
echo "       sudo mkdir -p /var/www/certbot"
echo "       sudo apt-get install -y certbot"
echo "       sudo certbot certonly --webroot -w /var/www/certbot -d $DOMAIN"
echo "  ② 部署 Nginx 配置（记得替换配置里的域名）："
echo "       sed -i 's/your-domain.com/$DOMAIN/g' $APP_DIR/deploy/nginx-https.conf"
echo "       sudo cp $APP_DIR/deploy/nginx-https.conf /etc/nginx/conf.d/lumen.conf"
echo "       sudo nginx -t && sudo systemctl reload nginx"
echo "  ③ 证书自动续期："
echo "       sudo certbot renew --dry-run"

echo
echo "=============================================="
echo " 部署完成。检查服务状态： pm2 status / pm2 logs lumen-api"
echo "=============================================="
