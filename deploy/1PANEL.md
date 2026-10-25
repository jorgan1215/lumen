# LUMEN · 光影集 —— 1Panel 面板部署手册

> 适用：服务器已装 1Panel，有域名，需要 HTTPS。
> 与裸机部署最大的区别：**1Panel 的 OpenResty 跑在 Docker 容器里**，反代地址有坑（见步骤五）。

---

## 〇、两个硬性前提

1. **Node 版本必须 ≥ 22.5** — 后端用了 `node:sqlite`。1Panel「运行环境 → Node.js」支持 16/18/20/22，**选 22**。
2. **域名已解析到服务器，且安全组放行 80 / 443**。3001 端口**不要**对外放行。

---

## 一、安装 OpenResty

应用商店 → 搜 **OpenResty** → 安装（1Panel 用它作为 Web 服务器，等价于 Nginx）。

---

## 二、上传代码 + 装依赖

**上传**：1Panel「文件」→ 进入 `/opt/1panel` 同级目录（建议 `/www/wwwroot/lumen`）→ 上传本地打好的 `lumen.tar.gz` → 右键解压。

或直接在「终端」里操作：

```bash
mkdir -p /www/wwwroot/lumen && cd /www/wwwroot/lumen
# （文件管理里上传压缩包后）
tar -xzf lumen.tar.gz
```

**装 Node 22**（面板自带的运行环境版本未必够，终端装最稳）：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22 && nvm alias default 22
node -v     # 必须 v22.5+
npm config set registry https://registry.npmmirror.com    # 国内加速
```

**装依赖 + 构建前端**：

```bash
cd /www/wwwroot/lumen
npm run setup      # 装前后端依赖
npm run build      # 产物在 client/dist
```

---

## 三、填写后端配置

「文件」→ 编辑 `/www/wwwroot/lumen/server/config.json`：

- `port` 改成 `3001`
- `jwtSecret`：`openssl rand -hex 32` 生成一个
- `admin.password`：**换强密码**
- `qiniu.domain`：必须 `https` 开头、结尾不带斜杠

（若 config.json 不存在，先 `cp server/config.example.json server/config.json`）

---

## 四、启动后端（二选一）

### 方式 A：终端 PM2（推荐，项目已有 ecosystem.config.js）

```bash
npm install -g pm2
cd /www/wwwroot/lumen
pm2 start ecosystem.config.js
pm2 save && pm2 startup
curl http://127.0.0.1:3001/api/site     # 应返回 {"name":"LUMEN","qiniuReady":true}
```

### 方式 B：工具箱 → 进程守护（Supervisor）

先初始化：工具箱 → 进程守护 → 初始化（若提示未安装，终端执行 `apt install -y supervisor`）。

创建守护进程时注意 **node 要写绝对路径**（`which node` 查，nvm 装的通常是 `/root/.nvm/versions/node/v22.x/bin/node`）：

| 字段 | 值 |
|---|---|
| 名称 | lumen-api |
| 运行用户 | root |
| 运行目录 | `/www/wwwroot/lumen/server` |
| 启动命令 | `/root/.nvm/versions/node/v22.22.2/bin/node src/index.js` |
| 进程数 | 1 |

### 备选：用「运行环境 → Node.js」容器

网站 → 运行环境 → Node.js → 创建运行环境：版本 **22**，项目目录 `/www/wwwroot/lumen/server`，启动命令 `node src/index.js`，端口映射 容器 `3001` → 主机 `3001`。

> 这条路子是**容器化**运行，SQLite 数据落盘依赖目录挂载，出问题不好排查。除非你熟悉容器，否则优先用方式 A。

---

## 五、创建前端静态网站

网站 → 网站 → **创建网站** → 类型选「**静态网站**」：

- 主域名：你的域名
- 网站目录：面板会自动生成，形如 `/opt/1panel/apps/openresty/<站点名>/www`

然后把**构建产物**传进去（注意是 `dist` 里面的内容，不是 client 源码）：

```bash
cp -r /www/wwwroot/lumen/client/dist/* /opt/1panel/apps/openresty/<站点名>/www/
```

或在「文件」里进到 `client/dist`，全选复制，粘贴到 www 目录。**`assets/` 目录必须一起带过去**，否则白屏。

---

## 六、配置反向代理（重点 / 容易 502）

网站 → 你的站点 → 设置 → **反向代理** → 创建：

| 字段 | 值 |
|---|---|
| 代理名称 | api |
| 代理路径前缀 | `/api` |
| 代理地址 | `http://127.0.0.1:3001` |

**⚠️ 如果访问 `/api/...` 返回 502**：说明你的 OpenResty 版本是 bridge 网络，容器里的 `127.0.0.1` 指的是容器自己，不是宿主机。把代理地址改成 Docker 网桥网关：

```bash
ip addr show docker0        # 看 inet，通常是 172.17.0.1
```

→ 代理地址填 `http://172.17.0.1:3001`

验证哪个能用（在 OpenResty 容器里测）：

```bash
docker exec -it $(docker ps --filter name=openresty -q) sh -c "curl -s http://127.0.0.1:3001/api/site"
docker exec -it $(docker ps --filter name=openresty -q) sh -c "curl -s http://172.17.0.1:3001/api/site"
```

哪个返回 JSON 就用哪个。

---

## 七、SPA 路由回退（否则 /admin 刷新 404）

网站 → 设置 → **配置文件**，在 `server { }` 块内确认/添加：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

保存后面板会自动 reload。

---

## 八、申请证书 + 强制 HTTPS

1. 网站 → **证书** → 申请证书 → Acme 账户（首次用邮箱创建）→ 验证方式：
   - HTTP 验证：最简单，要求域名已解析且 80 端口可达
   - DNS 验证：支持泛域名，需填 DNS 服务商 API
2. 回到网站 → 设置 → **HTTPS**：启用 → 选刚签的证书 → HTTP 选项选「**自动跳转到 HTTPS**」
3. 1Panel 会**自动续期**，不用管。

---

## 九、验收

- [ ] `https://你的域名` 首页正常
- [ ] 照片能加载（七牛域名是 https，否则被混合内容拦截）
- [ ] `https://你的域名/admin` 能登录（能登录说明反代通了）
- [ ] 刷新 `/admin` 不 404（说明 try_files 生效）
- [ ] 后台上传一张照片，前台能看到

---

## 十、日常更新与备份

**更新**：上传新代码 → 终端执行

```bash
cd /www/wwwroot/lumen
bash deploy/deploy.sh          # 备份数据库 → 重新构建 → 重启
cp -r client/dist/* /opt/1panel/apps/openresty/<站点名>/www/    # 同步前端产物
```

**备份**：1Panel「计划任务」→ 创建 Shell 脚本任务，每周执行一次：

```bash
tar -czf /www/backup/lumen-data-$(date +%Y%m%d).tar.gz -C /www/wwwroot/lumen server/data
```

照片本体在七牛云，服务器上只需备份这个 SQLite 目录。

---

## 常见问题速查

| 现象 | 排查 |
|---|---|
| `/api` 502 | 见步骤六，换 `172.17.0.1` |
| 首页白屏，控制台 404 | dist 上传不完整，缺 `assets/` 目录 |
| `/admin` 刷新 404 | 缺 `try_files` 回退（步骤七） |
| 后端起不来，报 node:sqlite | Node 版本低于 22.5 |
| 照片不显示 | 七牛 domain 是 http（混合内容被拦）或 Bucket 非公开 |
| 上传提示「七牛云未配置」 | config.json 里还是 `YOUR_` 占位符 |
