#!/usr/bin/env bash
# LUMEN 摄影网站 —— 更新部署脚本（代码更新后执行）
# 用法：APP_DIR=/var/www/lumen bash deploy/deploy.sh
#
# 说明：本脚本只做「重新构建 + 重启」，不会重新安装依赖。
#       如果 package.json 有变动，请先手动跑一次 npm run setup。
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/lumen}"
KEEP_BACKUPS="${KEEP_BACKUPS:-10}"

cd "$APP_DIR"

# ---------- 1. 备份数据库（照片本体在七牛，这里只备份元数据） ----------
mkdir -p "$APP_DIR/backups"
if [ -d server/data ]; then
  # WAL 模式下 lumen.db-wal 里可能有尚未合并的数据，所以整个目录打包
  tar -czf "$APP_DIR/backups/data-$(date +%Y%m%d-%H%M%S).tar.gz" server/data
  echo "[√] 已备份数据库到 $APP_DIR/backups/"
  # 只保留最近 N 份
  ls -1t "$APP_DIR/backups"/data-*.tar.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f
fi

# ---------- 2. 重新构建前端 ----------
echo "[1/2] 构建前端..."
npm run build

# ---------- 3. 重启后端 ----------
echo "[2/2] 重启后端..."
pm2 restart lumen-api --update-env
pm2 save

sleep 2
pm2 status lumen-api

# ---------- 4. 健康检查 ----------
if curl -fsS http://127.0.0.1:3001/api/site >/dev/null 2>&1; then
  echo "[√] 后端健康检查通过：$(curl -fsS http://127.0.0.1:3001/api/site)"
else
  echo "[×] 后端未响应，查看日志：pm2 logs lumen-api --lines 50"
  exit 1
fi
