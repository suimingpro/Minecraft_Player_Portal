# Minecraft Player Portal

Minecraft 玩家门户与统一认证管理平台，基于 FastAPI、Next.js 16、React 19 和 Ant Design 5。提供 Microsoft Entra ID SAML 单点登录、玩家档案与皮肤管理、Yggdrasil 外置认证，以及游戏服务器白名单和黑名单管理。

## 目录

- [功能概览](#功能概览)
- [项目结构](#项目结构)
- [首次使用与环境配置](#首次使用与环境配置)
- [Docker Compose 部署](#docker-compose-部署)
- [本地开发](#本地开发)
- [数据与日常维护](#数据与日常维护)
- [常见问题](#常见问题)
- [使用与操作指南](#-使用与操作指南)
- [游戏服务端配置](#-游戏服务端-minecraft-server-配置说明)

## 功能概览

| 功能 | 说明 |
| --- | --- |
| Microsoft Entra SSO | SAML 登录与注销、组织用户组同步、Redis Session 管理 |
| 玩家账号绑定 | 通过 `auth.aristois.net` 验证节点校验 Minecraft 角色所有权 |
| 皮肤与披风 | 上传、自定义皮肤模型、Mojang 材质同步、3D 预览 |
| Yggdrasil 外置认证 | 对接 HMCL、PCL2 等启动器，提供启动器独立登录凭据与材质签名 |
| 游戏服务器管理 | 服务器展示、独立鉴权地址、白名单和黑名单、玩家准入检查 |
| 管理后台 | 用户与角色管理、服务器管理、组别显示映射、网站名称与运行概览 |

## 项目结构

```text
Minecraft_Player_Portal/
├── .env.example              # 完整 Compose 部署的环境变量模板
├── docker-compose.yml        # Nginx、前端、后端、MariaDB、Redis
├── client/
│   ├── src/app/              # 页面、玩家功能和管理后台组件
│   ├── src/lib/              # API 客户端与应用配置
│   └── Dockerfile
├── server/
│   ├── .env.example          # 后端环境变量模板
│   ├── certs/                # SAML 证书、TLS 证书及 Yggdrasil 密钥
│   ├── uploads/              # 用户上传文件
│   ├── src/apps/             # MicrosoftSSO、Player、Server、Admin、Yggdrasil
│   ├── src/init_db.py        # 数据库建表与增量更新入口
│   └── Dockerfile
├── db/
│   ├── compose.yml           # 本地开发时单独启动 MariaDB
│   └── init.sql              # 完整 Compose 首次初始化 SQL
└── nginx/                    # 网关配置与启动脚本
```

## 首次使用与环境配置

以下命令除明确标注外，均在项目根目录执行。完整容器部署需要 Docker 和 Docker Compose；本地开发还需要 Node.js >= 20.9、Python 3.10+（建议 3.12）、MariaDB、Redis 和 OpenSSL。

### 1. 创建环境变量文件

首次使用时复制两个模板，然后按实际部署环境编辑生成的文件；已有配置时请直接编辑，避免覆盖。

```bash
cp .env.example .env
cp server/.env.example server/.env
```

| 文件 | 用途 | 需要配置的内容 |
| --- | --- | --- |
| `.env` | 根目录 `docker-compose.yml` 的变量替换与服务配置 | 数据库账号、端口、访问地址、SSL 开关、证书和数据目录 |
| `server/.env` | 后端本地运行配置；完整 Compose 也通过 `env_file` 加载 | 数据库、Redis、SAML、管理员组及会话配置 |
| `client/.env.local` | 前端本地开发配置，按需创建 | `NEXT_PUBLIC_API_BASE_URL` |
| `db/compose.yml` | 单独启动数据库时的初始化配置 | `environment` 下的四个 `MARIADB_*` 字段 |

模板中留空的连接、凭据和组织配置需要自行填写。实际 `.env`、私钥和含密码的本地配置不应提交到仓库。

### 2. 填写数据库信息

首次使用 `db/compose.yml` 前，填写以下四个字段；根目录 `.env` 中也应配置对应变量，使用同一数据库时保持一致：

| 变量 | 含义 |
| --- | --- |
| `MARIADB_ROOT_PASSWORD` | 数据库 root 密码 |
| `MARIADB_DATABASE` | 应用数据库名称，建议使用 `minecraft_portal` |
| `MARIADB_USER` | 应用数据库用户名 |
| `MARIADB_PASSWORD` | 应用数据库用户密码 |

完整 Compose 部署从根目录 `.env` 读取数据库配置；`db/compose.yml` 只用于单独启动数据库，两者无需同时运行。

`db/init.sql` 中的 `CREATE DATABASE` 和 `USE` 固定使用 `minecraft_portal`。如需自定义数据库名，请同步修改这两处 SQL，保证与配置一致。

本地运行后端时，在 `server/.env` 中填写实际连接串：

```env
DATABASE_URL=mysql+asyncmy://<用户名>:<密码>@127.0.0.1:3306/minecraft_portal
REDIS_URL=redis://127.0.0.1:6379/0
```

将尖括号及其内容替换为实际值；连接串中的密码含 `@`、`:`、`/` 等特殊字符时，需要进行 URL 编码。两个数据库模块均从 `DATABASE_URL` 读取连接信息，未配置时会报错。

完整 Compose 会自动注入容器网络中的 `DATABASE_URL` 和 `REDIS_URL`，覆盖 `server/.env` 中的同名变量。容器内的数据库主机为 `mariadb`，Redis 主机为 `redis`。

### 3. 配置 Microsoft Entra SAML

在 `server/.env` 中按 Entra 企业应用的 SAML 配置填写：

| 变量 | 配置说明 |
| --- | --- |
| `SAML_SP_ENTITY_ID` | 门户的 SP 标识符，与 Entra 中的 Identifier 一致 |
| `SAML_SP_ACS_URL` | 登录回调地址：`<后端对外地址>/auth/saml/acs` |
| `SAML_SP_SLS_URL` | 注销回调地址：`<后端对外地址>/auth/saml/sls` |
| `SAML_IDP_ENTITY_ID` | Entra 提供的标识符 |
| `SAML_IDP_SSO_URL` | Entra 提供的登录 URL |
| `SAML_IDP_SLO_URL` | Entra 提供的注销 URL |
| `SAML_IDP_CERT_PATH` | 下载的 SAML 签名公钥证书路径，如 `./certs/entra-saml.crt` |
| `ADMIN_GROUPS` | 管理员 Entra Group Object ID；多个值以英文逗号分隔，也支持 JSON 数组 |
| `FRONTEND_URL` | 登录完成后跳转的前端地址 |

这些 SAML 参数和签名证书需要在后端启动前配置完成。`ADMIN_GROUPS` 留空时，没有用户会通过组匹配获得管理员权限；Entra 还需要向应用发送对应的组声明。

### 4. 准备 Yggdrasil 密钥

若尚未生成密钥对，在项目根目录执行以下命令；已有密钥时请继续使用原文件。

```bash
mkdir -p server/certs/yggdrasil
openssl genrsa -out server/certs/yggdrasil/private.pem 4096
openssl rsa -in server/certs/yggdrasil/private.pem -pubout -out server/certs/yggdrasil/public.pem
```

在 `server/.env` 中填写模板对应路径：

```env
YGGDRASIL_PRIVATE_KEY=./certs/yggdrasil/private.pem
YGGDRASIL_PUBLIC_KEY=./certs/yggdrasil/public.pem
```

当前部分签名逻辑直接读取 `certs/yggdrasil/private.pem`，请保留上述目录结构。完整 Compose 部署时，`CERT_DIR` 指定的目录还需包含 `yggdrasil/` 密钥对和 SAML 证书。

## Docker Compose 部署

完成上述配置后，使用根目录 `docker-compose.yml` 启动全部服务：

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f
```

默认由 Nginx 提供同域名入口：

| 入口 | 默认地址 |
| --- | --- |
| 玩家门户 | `https://localhost` |
| Yggdrasil 认证 | `https://localhost/api/yggdrasil` |
| API 文档 | `https://localhost/docs` |
| 网关健康检查 | `https://localhost/healthz` |

实际访问地址以 `.env` 中的域名、协议和端口为准。前端 `/`、后端 `/auth/` 与 `/api/` 均通过网关访问，同域名部署时保持 `NEXT_PUBLIC_API_BASE_URL` 为空即可。

### HTTPS 与访问地址

| 场景 | 根目录 `.env` 配置 |
| --- | --- |
| Nginx 提供 HTTPS | `SSL_ENABLED=true`、`COOKIE_SECURE=true`，配置有效证书，公开 URL 使用 `https://` |
| 本地直接使用 HTTP | `SSL_ENABLED=false`、`COOKIE_SECURE=false`，公开 URL 使用 `http://` |
| 外部代理终止 HTTPS | 内部网关可设 `SSL_ENABLED=false`，公开 URL 仍使用 `https://`，`COOKIE_SECURE=true` |

`API_BASE_URL`、`FRONTEND_URL`、SAML 回调地址应与浏览器实际访问的协议、域名和端口保持一致。后端默认在容器内部使用 HTTP（`SERVER_SSL_ENABLED=false`）。

`CERT_DIR` 默认是根目录 `./cert`（指向 `server/certs` 的软链接）。Nginx 会自动识别该目录下的 `fullchain.pem` + `privkey.pem`、`server.crt` + `server.key` 或 `dev/localhost+2.pem` + `dev/localhost+2-key.pem`；开发证书需自行准备并在本机信任。启用 SSL 但未找到证书时，当前脚本会回退到 HTTP，请通过日志确认实际启动模式。

### 常用部署变量

| 变量 | 用途 |
| --- | --- |
| `HTTP_PORT` / `HTTPS_PORT` | 网关对外端口，默认 `80` / `443` |
| `CLIENT_HOST_IP` / `SERVER_HOST_IP` | 前后端直接访问的绑定 IP，默认 `127.0.0.1` |
| `MARIADB_HOST_IP` / `REDIS_HOST_IP` | 数据库与 Redis 的宿主机绑定 IP，默认 `127.0.0.1` |
| `MARIADB_PORT` / `REDIS_PORT` | 数据库与 Redis 的宿主机端口，默认 `3306` / `6379` |
| `DB_DATA_DIR` | MariaDB 数据目录，默认 `./db/data` |
| `CERT_DIR` | 宿主机证书与密钥目录 |
| `WORKERS` / `LOG_LEVEL` | 后端进程数与日志级别 |
| `NEXT_PUBLIC_API_BASE_URL` | 前端 API 地址；构建时写入浏览器代码，不可放置凭据 |

修改 `NEXT_PUBLIC_API_BASE_URL` 后需要重新构建前端镜像。

## 本地开发

### 1. 启动数据库与 Redis

先填写 `db/compose.yml` 的数据库信息，再从根目录执行：

```bash
docker compose -f db/compose.yml up -d
```

Redis 需另行安装或启动，监听地址应与 `server/.env` 中的 `REDIS_URL` 一致。不要同时启动根目录完整 Compose 中的数据库，避免端口和数据目录冲突。

### 2. 启动后端

确保已按首次使用说明配置 `server/.env`、SAML 证书及密钥。在一个新终端从项目根目录执行：

```bash
cd server
python3 -m venv myenv
source myenv/bin/activate
pip install -r requirements.txt
python -m src.init_db
uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
```

默认使用 HTTP，API 文档地址为 `http://localhost:8000/docs`。`python3-saml` 依赖系统的 XML/XMLSec 库，安装失败时需先安装对应系统依赖，可参考 `server/Dockerfile`。

如需后端 HTTPS，请准备并信任开发证书，再将最后一条命令改为：

```bash
uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload --ssl-keyfile certs/dev/localhost+2-key.pem --ssl-certfile certs/dev/localhost+2.pem
```

### 3. 启动前端

创建或编辑 `client/.env.local`，指向实际后端地址：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

在另一个新终端从项目根目录执行：

```bash
cd client
npm ci
npm run dev
```

前端默认地址为 `http://localhost:3000`，`npm run dev` 不会自动启用 HTTPS。本地 HTTP 开发时，`server/.env` 应设置 `FRONTEND_URL=http://localhost:3000`、`COOKIE_SECURE=false`，SAML 回调使用 `http://localhost:8000` 对应地址，并同步更新 Entra 配置。

## 数据与日常维护

完整 Compose 首次启动且数据库目录为空时，会执行 `db/init.sql`。后端入口脚本还会调用 `python -m src.init_db` 执行建表与增量更新；已有数据目录不会重复执行首次初始化 SQL。

| 数据 | 完整 Compose 默认存储位置 |
| --- | --- |
| MariaDB | `./db/data`，由 `DB_DATA_DIR` 控制 |
| 用户上传文件 | `./server/uploads` |
| Redis | Compose 命名卷 `redis_data` |
| 证书与签名密钥 | `CERT_DIR` 指定的宿主机目录 |

```bash
# 查看服务状态与后端日志
docker compose ps
docker compose logs -f server

# 更新配置或代码后重新构建并启动
docker compose up -d --build

# 停止并移除容器，保留持久化数据
docker compose down
```

数据库初始化账号与密码仅在数据目录首次初始化时生效。已有数据库修改 `.env` 或 `db/compose.yml` 中的密码，不会自动修改数据库内的用户密码，需同步更新数据库账号。

如需创建全新数据库，可先停止服务，将 `DB_DATA_DIR` 改为新的空目录后重新启动。该操作会切换到没有原有用户和业务记录的数据库；请保留旧目录及备份。备份时应同时考虑数据库、上传文件、签名密钥和实际环境配置。

## 常见问题

| 现象 | 检查项 |
| --- | --- |
| `Environment variable DATABASE_URL is required` | 本地后端是否从 `server/` 启动、`server/.env` 是否填写连接串；容器是否正确注入环境变量 |
| 数据库连接被拒绝或认证失败 | 数据库是否启动、账号与库名是否一致、已有数据库密码是否已同步修改；容器内不要用 `127.0.0.1` 连接另一个容器 |
| 后端报 SAML 参数缺失或证书不存在 | `server/.env` 中必填的 SAML 参数是否完整、证书是否下载并放入正确的挂载目录 |
| 登录后仍显示未登录 | 检查公开 URL、SAML 回调、`FRONTEND_URL` 和 Cookie 设置；HTTP 下 `COOKIE_SECURE` 应为 `false` |
| 前端 API 请求返回 404 | 完整 Compose 同域名部署保持前端 API 地址为空；本地开发填写实际后端地址，并重启开发服务或重新构建 |
| 网关使用了 HTTP | 查看 Nginx 日志，确认 `CERT_DIR` 中存在可识别的证书和私钥 |
| 启动失败或端口占用 | 确认没有同时运行 `db/compose.yml` 和完整 Compose 的数据库服务 |

## 🎮 使用与操作指南

### 1. 登录平台

1. 访问部署后的门户地址（完整 Compose 部署默认为 `https://localhost`，本地开发默认为 `http://localhost:3000`）。
2. 点击右上角 **“微软单点登录 (Microsoft Login)”**，完成组织的 Microsoft Entra SAML 统一认证。

### 2. 绑定 Minecraft 账号与设置皮肤

1. 进入 **“皮肤” (Skin)** 页面。
2. 启动 Minecraft 客户端，加入验证服务器 **`auth.aristois.net`**。
3. 客户端被踢出后获得一串 **6 位验证码**，填入 Portal 对应输入框并完成所有权验证绑定。
4. 绑定成功后，可上传本地自定义皮肤文件（PNG）或点击 **“同步官网皮肤”** 提取官方正版皮肤。

### 3. 第三方启动器登录 (HMCL / PCL2 等)

1. 进入 **“个人中心” (Profile)** 页面。
2. 查看 **“Minecraft 启动器登录凭证”** 卡片。
3. 在启动器中添加外置认证服务器（Authlib-Injector）：
   - 可直接按住 **“点住拖拽我到启动器一键导入”** 按钮拖入启动器窗口。
   - 或手动复制页面的 `Yggdrasil 认证地址`：`https://<YOUR_BACKEND>/api/yggdrasil`。
4. 使用您的 **登录邮箱** 以及卡片中展示的 **启动器独立密码** 进行登录。

### 4. 浏览服务器与进服准入白名单

1. 进入 **“服务器” (Server)** 页面。
2. 浏览已公开的游戏服务器信息、简介与连接地址，支持一键点击复制 IP。
3. 卡片右上角显示您当前角色的准入状态：
   - 🟢 `全员开放 / 允许加入`：该服务器无需白名单审核。
   - 🟢 `已在白名单 / 允许加入`：管理员已将您的角色加入该服务器白名单。
   - 🔴 `未在白名单 / 暂无权限`：该服务器启用了白名单，请联系管理员为您添加进服权限。
   - 🚫 `已在黑名单 / 禁止进入`：该服务器黑名单包含当前角色，已被拒绝加入。

### 5. 管理员控制台 (Admin)
拥有管理员角色组的用户可在导航栏访问 **“管理后台”**：

- **用户与角色管理**：
  - 点击“查看用户信息”，可查看该用户的组织认证详情与绑定玩家。
  - 点击“修改绑定的角色”，管理员可手动修改其绑定的 Minecraft 用户名与 UUID。
  - 点击“加入白名单”，支持将该用户绑定的角色快速一键添加到指定的多个服务器中。
- **服务器管理**：
  - **添加服务器**：配置服务器名称、简介、连接地址、上传方形头像，设定进服模式（全员开放 / 白名单制 / 黑名单制），并选择是否在 Server 页展示。
  - **名单管理**：支持切换查看白名单或黑名单，提供关键词过滤搜索，支持单独移除或批量添加玩家 UUID。
  - **获取验证端点**：复制为游戏服务器分配的独立鉴权 URL（`https://<domain>/api/yggdrasil/{server_id}`）。

---

## 🧩 游戏服务端 (Minecraft Server) 配置说明

若要将您的 Minecraft 服务器接入特定独立鉴权与白名单过滤：

1. 为游戏服务端安装 **[authlib-injector](https://github.com/yushijinhun/authlib-injector)**。
2. 在服务端启动脚本（如 `run.sh` 或 `start.bat`）中添加 JVM 参数：

   ```bash
   java -javaagent:authlib-injector.jar=https://<YOUR_BACKEND_DOMAIN>/api/yggdrasil/<SERVER_ID> -jar server.jar nogui
   ```
   > 其中 `<SERVER_ID>` 是在管理后台“服务器管理”中分配的唯一服务器 UUID。
3. 服务端将在玩家进入服务器时自动校验该服务器的 `access_mode` 与名单规则，不在白名单或处于黑名单中的玩家将无法通过进服鉴权。

---

## 许可证

项目声明采用 MIT 许可证；当前目录尚未包含独立的 `LICENSE` 文件。
