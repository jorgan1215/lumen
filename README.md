# LUMEN · 光影集

个人摄影网站：Vite + Vue 3 前端，Node.js + Express 后端，七牛云对象存储存照片，SQLite（Node 内置 `node:sqlite`，零原生依赖）存影集与照片元数据。

## 功能

**展示站**
- 暗色电影感首页：散景光影画布、视差滚动、入场动画
- 影集列表：标题、英文副标题、描述、拍摄地点 / 时间、照片数、封面
- 影集详情：瀑布流照片墙，悬停显示光圈 / 快门 / ISO
- 全屏灯箱：键盘 ← → 切换、ESC 关闭，展示光圈、快门、ISO、焦距、机身、拍摄时间与描述

**管理后台**（`/admin`，账号密码在 `server/config.json`）
- 影集创建 / 编辑 / 删除，封面设置
- 照片拖拽上传：浏览器直传七牛云（不占服务器带宽），自动读取 EXIF（光圈、快门、ISO、焦距、机身、拍摄时间），可编辑描述

## 目录结构

```
├── client/            # Vite + Vue 3 + TS + Tailwind 前端
├── server/            # Express API + SQLite
│   ├── config.example.json   # 配置模板
│   ├── config.json           # 真实配置（已 gitignore，首次启动自动复制模板）
│   └── data/lumen.db         # SQLite 数据库（自动生成）
├── scripts/dev.mjs    # 一键启动前后端开发环境
├── ecosystem.config.js       # PM2 配置
└── nginx.conf.example        # Nginx 部署示例
```

## 本地开发

要求 Node.js ≥ 22.5（推荐 24 LTS）。

```bash
npm run setup   # 安装 server 和 client 的依赖（仅首次）
npm run dev     # 同时启动后端 (3001) 和前端 (7100)
```

打开 http://localhost:7100 。首次启动会写入 3 个示例影集（可在后台删除）。

## 配置（server/config.json）

```json
{
  "port": 3001,
  "jwtSecret": "换成一个足够长的随机字符串",
  "admin": { "username": "admin", "password": "换成强密码" },
  "qiniu": {
    "accessKey": "七牛 AccessKey",
    "secretKey": "七牛 SecretKey",
    "bucket": "空间名",
    "domain": "https://cdn.example.com",
    "prefix": "photos/"
  }
}
```

> AK/SK 在七牛控制台「密钥管理」获取；`domain` 是 Bucket 绑定的 CDN/测试域名（公开 Bucket，不带斜杠结尾）；`prefix` 是文件前缀目录。

## 部署到 Linux

```bash
# 1. 上传代码到服务器，如 /var/www/lumen
cd /var/www/lumen

# 2. 安装依赖并填写配置
npm run setup
cp server/config.example.json server/config.json
vim server/config.json          # 填七牛密钥、管理员密码

# 3. 构建前端
npm run build

# 4. PM2 启动后端
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save && pm2 startup

# 5. Nginx：参考 nginx.conf.example，托管 client/dist 并反代 /api 到 3001
```

SQLite 数据库文件在 `server/data/lumen.db`，备份整站数据只需备份这一个文件（照片本体在七牛云）。

## API 一览

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/login` | 管理员登录，返回 JWT |
| GET | `/api/albums` | 影集列表（含照片数） |
| GET | `/api/albums/:id` | 影集详情（含照片） |
| GET | `/api/admin/upload-token` | 获取七牛上传凭证（需登录） |
| POST/PUT/DELETE | `/api/admin/albums[/:id]` | 影集管理（需登录） |
| POST/PUT/DELETE | `/api/admin/photos[/:id]` | 照片管理（需登录） |
