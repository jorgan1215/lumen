# LUMEN · 光影集 —— Linux 服务器部署手册

目标环境：Linux 云服务器（Ubuntu/Debian/CentOS 均可）+ 域名 + HTTPS。
架构：Nginx 托管前端静态文件（`client/dist`）+ 反代 `/api` 到本机 Node 服务（127.0.0.1:3001）+ PM2 守护 + SQLite 存元数据 + 七牛云存照片。

---

## 〇、开始之前：两个必须知道的坑

### 坑 1：`server/config.example.json` 原本不存在

`server/src/config.js` 的逻辑是：如果 `config.json` 不存在，就从 `config.example.json` 复制。但这个文件在仓库里是缺的（且 `config.json` 被 `.gitignore` 排除），所以在全新服务器上直接启动会**因为找不到模板文件而崩溃**。

已修复：现在 `server/config.example.json` 已补齐。

### 坑 2：端口号 3010 与 3001 不一致

- 你本机的 `server/config.json` 里 `"port": 3010`
- 但 `ecosystem.config.js`（PM2）通过环境变量强制 `PORT=3001`
- `nginx.conf.example` 反代的是 `3001`

`config.js` 的优先级是 `process.env.PORT > config.json`，所以**只要用 PM2 启动就是 3001，和 Nginx 对得上**。但如果你手动 `npm start`（没有 PORT 环境变量），服务会监听 3010，Nginx 就会 502。

**建议**：把服务器上的 `config.json` 里 `port` 改成 `3001`，保持一致。

### 坑 3（国内服务器）：域名必须完成 ICP 备案

如果服务器在阿里云/腾讯云等中国大陆机房，域名必须先备案，否则 80/443 端口会被拦截。

---

## 一、本地打包代码

项目不是 git 仓库，也没有 `.git`，所以走「打包 → 上传」的方式。在本机 Git Bash / 终端执行：

```bash
cd "C:/Users/hp/Documents/kimi/Workspaces/摄影网站"

tar --exclude=node_modules --exclude=dist --exclude=server/data --exclude=backups \
    -czf lumen.tar.gz .
```

- 排除 `node_modules`、`dist`：到服务器上重新安装和构建（避免 Windows 编译产物不兼容）
- 排除 `server/data`：数据库不上传，服务器上会自动新建
- **不排除** `server/config.json`：它含七牛密钥和管理员密码，被 gitignore 了，必须随包上传

上传到服务器：

```bash
scp lumen.tar.gz user@你的服务器IP:/tmp/
```

---

## 二、服务器环境准备

```bash
# 1. 安装 Node 22（后端用了 node:sqlite，要求 >= 22.5）— 推荐 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22 && nvm alias default 22
node -v    # 应输出 v22.x

# 2. 安装 Nginx 和 certbot
sudo apt-get update
sudo apt-get install -y nginx certbot

# 3. 创建目录并解压
sudo mkdir -p /var/www/lumen
sudo chown -R $USER:$USER /var/www/lumen
cd /var/www/lumen && tar -xzf /tmp/lumen.tar.gz
```

> **`node:sqlite` 是 Node 22.5+ 的实验性 API**，启动时会有 `ExperimentalWarning`，属正常现象，不影响使用。

---

## 三、填写配置

```bash
cd /var/www/lumen
cp server/config.example.json server/config.json   # 如果包里没带
vim server/config.json
```

必填项：

| 字段 | 说明 |
|---|---|
| `port` | 改成 `3001` |
| `jwtSecret` | 换成 32 位以上随机字符串（`openssl rand -hex 32` 生成） |
| `admin.password` | **务必改强密码**，这是后台唯一入口 |
| `qiniu.accessKey` / `secretKey` | 七牛控制台 → 密钥管理 |
| `qiniu.bucket` | 空间名 |
| `qiniu.domain` | Bucket 绑定的 CDN 域名，**必须 https 开头、结尾不带斜杠** |

七牛 domain 若用 http，HTTPS 页面下会被浏览器拦截为混合内容，导致照片显示不出来。

---

## 四、构建并启动服务

一键脚本：

```bash
cd /var/www/lumen
bash deploy/setup.sh
```

或手动执行：

```bash
npm run setup              # 安装 server 和 client 依赖
npm run build              # 构建前端 → client/dist

npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup                # 按它输出的提示，再跑一次那条 sudo 命令，实现开机自启

pm2 status                 # 确认 lumen-api 为 online
pm2 logs lumen-api         # 看日志
```

验证后端：

```bash
curl http://127.0.0.1:3001/api/site
# 返回 {"name":"LUMEN","qiniuReady":true} 即为正常
```

---

## 五、Nginx + HTTPS

1. **先确保域名已解析到服务器公网 IP，且防火墙放行 80 / 443**（3001 不要放行，它只监听 127.0.0.1）。

2. 申请证书：

```bash
sudo mkdir -p /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot -d your-domain.com
```

3. 部署配置：

```bash
sed -i 's/your-domain.com/你的真实域名/g' /var/www/lumen/deploy/nginx-https.conf
sudo cp /var/www/lumen/deploy/nginx-https.conf /etc/nginx/conf.d/lumen.conf
sudo nginx -t              # 必须输出 successful
sudo systemctl reload nginx
```

4. 验证自动续期：

```bash
sudo certbot renew --dry-run
```

---

## 六、验收

浏览器打开 `https://你的域名`：

- [ ] 首页能正常显示，影集列表有数据
- [ ] 照片能加载（说明七牛域名 HTTPS 配置正确）
- [ ] 打开 `https://你的域名/admin`，用 config.json 里的账号密码登录
- [ ] 上传一张照片，确认能写进七牛并在前台显示
- [ ] 用手机 4G 访问一次，确认外网可达

> 首次启动会自动写入 3 个示例影集，可在后台删除。

---

## 七、日常更新

代码改动后，在本机重新打包上传，然后：

```bash
cd /var/www/lumen
tar -xzf /tmp/lumen.tar.gz     # 覆盖源码
bash deploy/deploy.sh          # 自动备份数据库 → 重新构建 → 重启服务 → 健康检查
```

如果 `package.json` 有变动，先手动跑一次 `npm run setup` 再执行脚本。

---

## 八、备份与回滚

照片本体在七牛云，服务器上的数据只有数据库。备份整个 `server/data` 目录（SQLite 是 WAL 模式，只拷 `.db` 文件可能丢未合并的数据）：

```bash
cd /var/www/lumen
tar -czf backups/data-$(date +%Y%m%d-%H%M%S).tar.gz server/data
```

`deploy/deploy.sh` 每次更新会自动做这件事，并只保留最近 10 份。

回滚：停服务 → 解压旧备份覆盖 `server/data` → `pm2 restart lumen-api`。

---

## 九、常见问题

| 现象 | 原因与处理 |
|---|---|
| 页面 502 | 后端没起来：`pm2 status` / `pm2 logs lumen-api`；或端口不对（见坑 2） |
| 首页能开但照片空白 | 七牛 `domain` 用了 http（混合内容被拦），或 Bucket 权限不是公开 |
| `/admin` 刷新后 404 | Nginx 缺少 `try_files $uri $uri/ /index.html;` 回退 |
| 上传失败提示「七牛云未配置」 | config.json 里还有 `YOUR_` 开头的占位符 |
| 后端报 `node:sqlite` 找不到 | Node 版本低于 22.5，用 `nvm use 22` |
| 数据库锁 / 数据没更新 | WAL 文件与 db 文件不匹配，备份请打包整个 `server/data` |
