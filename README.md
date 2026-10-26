# LUMEN · 个人摄影网站

以照片为中心的轻量摄影作品集。白色纸感界面搭配金色字标和鎏金相册装饰，提供中英文浏览、渐进式图片加载、完整的影集管理与 AI 双语文案辅助。

网站名称、作者、关于页面、首页轮播图、音乐和服务配置均可在后台修改，适合摄影师部署自己的作品集。

## 功能

### 作品展示

- 首页精选图轮播：可配置多张照片、每张中英文文案、排列顺序及播放间隔。
- 导航“精选”跳转首页精选影集，“全部”进入 `/albums`（英文 `/en/albums`）。全部影集沿用精选区的细金框封面，按拍摄年月倒序展示，支持年份跳转；未填写日期的影集单独归档。
- 管理端影集信息中可勾选“加入精选影集”，保存后生效。升级时已有影集默认保留精选，新建影集默认不加入；取消精选的公开影集仍在“全部”中显示。
- 影集封面与照片瀑布流，支持自定义访问标识、影集密码、隐藏相册和上下影集切换。隐藏相册仅管理员可见，访客无法通过影集列表、直接链接或下载接口访问。
- 照片查看器：黑色背景、默认保持照片比例完整适配屏幕，宽或高达到可用区域上限，不裁切画面、鼠标指向缩放、双击放大、拖动平移、键盘切图；移动端支持滑动切图与双指捏合。
- 照片预览支持带图片 ID 的分享链接，例如 `/album/2?photo=5` 或 `/en/album/2?photo=5`。打开照片、切换照片时同步更新地址；直接访问链接会在影集加载或解锁后打开对应照片，关闭预览时移除图片参数。
- 在查看器的大图区域滚轮缩放，底部缩略图栏滚轮切换上一张/下一张；放大时保留两侧切图按钮，隐藏照片信息和浮动缩略图栏；缩略图栏透明显示，不增加底部亮带；少量缩略图自动居中，较多时可横向滚动。
- 优先展示代理图；影集代理图加载完成后按队列加载原图，正在查看的照片优先。支持原图状态显示与下载。下载通过同源接口直接向浏览器流式传输，不需要前端先缓存整张原图；手机端在点击时交由浏览器原生页面处理。
- 展示光圈、快门、ISO、焦距、相机、镜头、时间等元信息。
- 导航栏右侧提供音符按钮，可配置背景音乐音源及音量，留空使用内置的 Meditation Impromptu 01 钢琴曲，音量设为 0 可静音；打开网站尝试自动播放；浏览器拦截有声自动播放时，首次点击页面后启动。支持即时暂停及加载状态，切换页面不中断。
- 中英文界面、自定义站名与副标题、网站图标、关于页面与作者版权，版权年份自动更新。

### 管理中心

登录 `/admin`，顶部提供六个管理子页：

| 子页 | 管理内容 |
| --- | --- |
| 网站 | 影集/照片统计、网站名称、副标题、作者、简介、图标、时区、关于页面 |
| 影集 | 创建与编辑影集、设置隐藏、拖动排序、上传与编辑照片、压缩参数、AI 填写 |
| 轮播图 | 首页精选图、双语文案、顺序及轮播间隔 |
| 背景音乐 | 音源 URL、音量；留空使用内置钢琴曲 |
| 配置 | 七牛云、管理员账号、JWT、端口与上传凭证有效期，以及 AI 模型 |
| 回收站 | 恢复照片、彻底删除与清空 |

照片通过浏览器直接上传七牛云，服务器签发限定对象的上传凭证。上传前读取 EXIF，可分别配置展示大图与代理图的尺寸、质量和体积预算；参数在当前浏览器保存，支持选择本地照片试算压缩结果。也可以通过图片外链添加照片。

删除照片先进入回收站；彻底删除会删除数据库记录及关联七牛对象。删除整个影集也会清理其关联照片和云端文件。

### AI 文案

- 在相册编辑表单上方描述拍摄主题、地点、时间和文案风格，生成中英文标题、介绍、地点、副标题、日期与访问标识。
- 新相册直接填入表单；已有相册会询问是否覆盖。点击保存后才写入数据库。
- 时间根据描述推断，如“去年十月”“2024年6月2日”；未提供时间时按网站时区填写当天日期，默认 `Asia/Shanghai`。
- 照片编辑弹窗可生成中英文文案，向模型提供照片、相册上下文和 EXIF 元信息。
- 默认模型配置为 `deepseek-flash`，使用兼容 Chat Completions 的 HTTPS 接口；模型名称、地址、密钥和图片输入能力均可自定义。照片文案需服务商支持图片输入，实际可用模型以所选平台为准。
- 已保存密钥不回显；AI 请求只在点击生成时发送。照片及相关元信息会发送给配置的模型服务商。

中文页面使用 `/`、`/album/:id`、`/about` 等路径；英文页面使用 `/en`、`/en/album/:id`、`/en/about`。点击语言按钮会保留当前页面、查询参数和锚点并切换路径，分享英文链接即可直接进入英文模式。

手机导航采用两行布局，保证英文标签、语言切换和音符按钮都完整显示且便于点击。

## 技术栈

| 层次 | 技术 |
| --- | --- |
| 前端 | Vue 3、TypeScript、Vue Router、Vite、Tailwind CSS |
| API | Node.js、Express、JWT |
| 数据库 | Node.js 内置 `node:sqlite`，SQLite WAL 模式 |
| 存储 | 七牛云 SDK / 浏览器直传、外链图片 |
| 图片处理 | Canvas 编码、WebP/JPEG、exifr 元信息读取 |
| 部署 | Nginx 静态托管与 API 反代，PM2 进程管理 |

无需单独安装数据库服务。图片文件保存在对象存储，SQLite 保存图片地址、元信息与网站设置。

## 快速开始

### 1. 准备环境

- Node.js **24 或更新版本**，以及 npm。
- 可选：七牛云存储空间及可访问的图片域名。
- 可选：兼容 Chat Completions 的模型账号与 API Key。

```sh
# 在项目根目录安装前后端依赖
npm run setup
cp server/config.example.json server/config.json
```

编辑 `server/config.json`，至少设置管理员账号、强密码和随机 JWT 密钥。可使用以下命令生成签名密钥：

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

### 2. 启动开发服务

```sh
npm run dev
```

- 网站与后台：http://localhost:7100
- API 默认：http://localhost:3001

开发脚本同时启动 API 和 Vite，Vite 将 `/api` 请求代理到 API。数据库在首次启动时自动创建；空影集数据库会写入示例影集和来自 Picsum 的外链照片，可在后台替换。七牛云尚未配置时仍可浏览和通过外链添加照片。

如需自定义本地端口：

```sh
API_PORT=3002 npm run dev -- --port 7200
```

### 3. 配置自己的站点

登录 `/admin`：

1. 在“网站”填写站名、副标题、作者和关于内容，作者自动用于页脚版权。
2. 在“配置”填写七牛云 Bucket、域名、Access Key、Secret Key 及目录前缀；需要 AI 时填写模型配置。
3. 在“影集”点击右侧“创建相册”，填写并保存，然后上传照片。
4. 配置首页轮播图，按需添加背景音乐。

## 配置说明

基础模板位于 `server/config.example.json`，真实配置位于 `server/config.json`。

| 字段 | 用途 |
| --- | --- |
| `port` | API 端口，默认 3001 |
| `admin.username` / `admin.password` | 管理员登录账号与密码 |
| `jwtSecret` | 登录与影集访问凭证的签名密钥 |
| `jwtExpiresIn` | 管理员登录有效期，如 `7d`、`12h`、`30m` |
| `qiniu.accessKey` / `qiniu.secretKey` | 七牛云密钥 |
| `qiniu.bucket` | 存储空间名称 |
| `qiniu.domain` | 图片访问域名，含 `https://` |
| `qiniu.prefix` | 对象 key 的目录前缀，如 `photos/` |
| `uploadTokenExpires` | 上传凭证有效期，单位秒 |
| `ai.baseUrl` / `ai.model` / `ai.apiKey` / `ai.vision` | 初始模型配置 |

后台“配置”可修改这些设置。敏感字段留空保留现有值，服务器不会把已保存的密钥返回浏览器。七牛与有效期设置保存后生效；修改管理员用户名、密码或 JWT 密钥后需重新登录。端口修改需重启服务并同步调整反向代理。

模型配置通过后台保存到 `server/data/ai-config.json`，优先于 `config.json` 的 `ai` 字段。`LUMEN_AI_API_KEY` 环境变量优先于文件中的模型密钥。`PORT` 环境变量优先于文件端口；开发脚本和提供的 PM2 示例均显式指定 API 端口，修改端口时也应调整对应配置。

七牛云需要允许网站来源的浏览器跨域上传；图片展示域名需能公开访问。现有图片地址不会随七牛配置变更自动迁移。启用 HTTPS 的网站应使用 HTTPS 图片、音乐及模型地址。

## 生产部署

以下示例假设项目位于 `/var/www/lumen`，域名为 `photos.example.com`。

### 构建前端、运行 API

```sh
cd /var/www/lumen
npm run setup
# 首次部署时创建并填写 server/config.json；更新部署不要覆盖现有配置
npm run build
npm start
```

`npm start` **仅启动 API**。前端构建产物位于 `client/dist`，需由 Nginx 等静态服务器提供。

长期运行可使用项目内的 PM2 配置（先安装 PM2）：

```sh
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

`ecosystem.config.js` 默认使用一个 API 进程，端口为 3001。确保 PM2 使用 Node.js 24+；按 `pm2 startup` 输出完成系统服务配置。

### 配置 Nginx

修改项目内的 `nginx.conf.example`：

- `server_name` 改为自己的域名。
- `root` 指向 `/var/www/lumen/client/dist`。
- `/api/` 代理到 `http://127.0.0.1:3001`，端口与 API 保持一致。
- 保留 `try_files $uri $uri/ /index.html`，支持直接访问 `/album/...`、`/about`、`/admin`。

安装配置后执行：

```sh
sudo nginx -t
sudo systemctl reload nginx
```

为域名配置 HTTPS 证书，并保持后端配置文件和数据目录仅对运行服务的账户可读写。管理员密码与密钥不要放入前端环境变量。

### 更新与备份

```sh
npm run setup
npm run build
pm2 restart lumen-api
```

更新前保留 `server/config.json` 和 `server/data/`。备份 SQLite 时应使用 SQLite 备份方式，或停服后完整复制数据目录，包括尚未合并的 WAL 文件。照片在七牛云，数据库备份不包含图片文件，需单独管理存储备份。

## 项目结构

```text
client/
  src/components/    导航、照片、查看器与配置表单
  src/views/         首页、影集、关于、登录和管理中心
  src/lib/           图片压缩、原图队列、缩放、站点设置等
  public/            网站 logo 等静态资源
server/
  src/               Express API、SQLite、七牛与 AI 逻辑
  config.example.json
  config.json        本地部署配置（不提交）
  data/              SQLite 与模型配置（不提交）
scripts/dev.mjs      本地联合启动脚本
tests/               核心逻辑测试
nginx.conf.example   Nginx 示例
ecosystem.config.js  PM2 示例
```

## 开发命令

```sh
npm run dev                    # 启动前后端开发服务
npm run build                  # 构建前端
npm start                      # 启动后端 API
node --test tests/*.test.mjs    # 运行核心逻辑测试
```

`client/tests/` 下提供开发环境专用页面，辅助检查图片加载和管理表单；不包含在默认生产构建入口中。相册表单验证页面使用固定模拟 AI 返回值并禁用数据写入。

网站字标使用本地思源宋体 Black（900）字符子集，按 Unicode 范围加载；字体源自 [Adobe Source Han Serif](https://github.com/adobe-fonts/source-han-serif)，授权见 `client/public/fonts/source-serif/LICENSE.txt`。

内置音乐为 Kevin MacLeod 的 “Meditation Impromptu 01”，使用 CC BY 4.0 授权；来源及授权见 `client/public/audio/LICENSE.txt`，网站关于页面显示署名。

## 源码与许可

项目使用 [Apache License 2.0](LICENSE.txt)。网站中的个人照片、文字和其他素材的权利以各自作者授权为准。

`.gitignore` 排除了真实配置、运行数据、依赖、构建产物及本地备份。发布源码时保留配置模板，使用自己的站点内容和配置重新部署即可。
