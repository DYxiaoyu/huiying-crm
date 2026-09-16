# 员工客户管理系统 · 全栈版部署说明

## 这是什么
客户跟进管理系统（React 前端 + NestJS 后端 + PostgreSQL 数据库）。
员工可注册账号、录入自己名下的客户和跟进进度，数据实时共享、多人隔离，部署在 Render 免费托管上。

## 目录结构（不用理解每行，知道大概即可）
| 文件夹 | 作用 |
|---|---|
| client/ | 前端页面（登录、概览、客户列表、详情） |
| server/ | 后端接口 + 数据库操作 |
| shared/ | 前后端共用的数据类型 |
| scripts/ | 构建脚本 |
| render.yaml | **Render 部署配置（已帮你改好，会自动建数据库）** |

## 部署步骤（跟着做就行）

### 第一步：把代码传到 GitHub
1. 打开 github.com → 右上角 + → **New repository**
2. 名称随意（如 `customer-crm`），**一定要选 Private（私有）**，不要勾选任何初始化选项
3. 创建后复制页面上的仓库地址（形如 `https://github.com/你的用户名/customer-crm.git`）
4. 在电脑上打开本文件夹，右键 → **在终端中打开**（或按住 Shift 右键选"在此处打开 PowerShell 窗口"）
5. 依次执行以下命令（把地址换成你自己的）：
   ```
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/你的用户名/customer-crm.git
   git push -u origin main
   ```
6. 刷新 GitHub 页面，看到代码上传成功即可

### 第二步：改 render.yaml 里的仓库名
用记事本打开本文件夹里的 `render.yaml`，找到：
```
repo: your-github-name/your-repo-name
```
改成你第一步创建的**用户名/仓库名**（例如 `zhangsan/customer-crm`），保存。
**改完后再执行一遍上面的上传命令**（`git add .` → `git commit` → `git push`）。

### 第三步：在 Render 部署
1. 打开 render.com → 注册/登录（可用 GitHub 账号直接登录）
2. 点 **New +** → **Blueprint**
3. 选择你的 GitHub 仓库（如果没看到，先点 Configure account 授权）
4. Render 自动读取 render.yaml，显示将要创建：1 个 Web 服务 + 1 个 Postgres 数据库 → 点 **Apply**
5. 等 3~10 分钟构建完成，点服务上方的链接（形如 `https://customer-crm-web.onrender.com`）即可访问
6. 打开页面 → 注册一个员工账号 → 开始录客户

---

# 方案二：自己买服务器部署（Docker，推荐）

> 适合想长期自己掌控服务器的同学。用 Docker 一条命令把「数据库 + 应用」一起跑起来，省心、可迁移。

## 准备
1. **买服务器**：2核4G 起步（1核2G 会比较吃力）。系统选 **Ubuntu 22.04**（重要，后面命令都基于它）
2. **开放端口**：在服务器商的控制台 → 安全组/防火墙，放行 **22**（SSH）和 **80**（网页）端口
3. **记下服务器公网 IP**

## 第一步：连接服务器
Windows 电脑上打开 PowerShell（开始菜单搜索 powershell），输入：
```
ssh root@你的服务器IP
```
回车后输入服务器密码（输入时不显示字符，正常）。看到 `root@xxx:~#` 就成功了。

## 第二步：安装 Docker（复制粘贴整段回车）
```
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
```
装完验证：`docker --version` 有版本号即可。

## 第三步：把代码传到服务器
**方式 A（推荐，有 GitHub 仓库时）**
1. 先把项目推到你的 GitHub 仓库（方法见方案一第一步）
2. 服务器上执行：`git clone https://github.com/你的用户名/你的仓库名.git`
3. 进入目录：`cd 你的仓库名`

**方式 B（没有 GitHub）**
用宝塔面板 / FileZilla / WinSCP 等工具，把整个项目文件夹直接传到服务器任意目录，然后在服务器上 `cd` 进入该目录。

## 第四步：改数据库密码（可选但建议）
用命令 `nano docker-compose.yml` 打开文件，把两处 `change_this_password` 改成你自己的密码（比如 `MyPass2026`），按 Ctrl+X → Y → 回车 保存。

## 第五步：构建并启动（首次约 5~10 分钟）
```
docker compose up -d
```
看到 `Started` 相关提示就成功了。

## 第六步：打开系统
浏览器访问 `http://你的服务器IP`，注册员工账号即可使用。

## 日常维护
| 操作 | 命令 |
|---|---|
| 查看运行状态 | `docker compose ps` |
| 查看日志 | `docker compose logs -f app` |
| 更新代码后重新部署 | `git pull` 然后 `docker compose up -d --build` |
| 重启 | `docker compose restart` |
| 数据备份 | `docker compose exec db pg_dump -U customer_crm customer_crm > backup.sql` |

## 绑定域名 + HTTPS（以后想加再加）
1. 把域名解析到服务器 IP（A 记录）
2. 在服务器上装 Nginx 或宝塔面板，做反向代理到 127.0.0.1:10000
3. 用 Let's Encrypt / 宝塔一键申请免费 SSL 证书

---

# 方案三：宝塔面板（图形界面，适合不想敲命令）

1. 服务器上安装宝塔：`wget -O install.sh http://download.bt.cn/install/install_6.0.sh && bash install.sh`，按提示装完，记下面板地址和账号密码
2. 打开面板 → 软件商店：安装 **Docker 管理器**、**Nginx**
3. 把项目文件夹上传到 `/www/wwwroot/`
4. 用面板的「终端」进入项目目录，执行 `npm install` 和 `npm run build:prod`
5. 装 PostgreSQL（软件商店里装，或直接用 Docker 管理器运行 postgres 镜像，密码和连接串填到项目的 `.env` 里：`DATABASE_URL=postgres://用户名:密码@127.0.0.1:5432/数据库名`）
6. 启动：`node dist/server/main.js` 后台运行（或用 PM2 管理器守护）
7. 网站 → 添加站点 → 反向代理到 `127.0.0.1:10000`，再申请免费 SSL

---

## 注意事项
1. **`.env` 不要上传**：`.gitignore` 已帮你忽略，不会传到 GitHub（里面有本机配置）
2. **免费数据库有期限**：Render 免费 Postgres 约 30 天后需要升级（约 $7/月）或换其他免费数据库（如 Neon）。到期前数据会提醒你，升级后数据不丢
3. **如果构建报 Node 版本错误**：打开服务 → Settings → 把 Node Version 改为 22.x → 重新 Deploy
4. **以后每次更新**：改完代码 `git push` 即可，Render 自动重新部署（autoDeploy 已开启）

## 常用命令（本地开发调试用）
```
npm install        # 安装依赖（首次）
npm run dev        # 本地开发（自动起前端+后端）
npm run build:prod # 构建生产版本
```
