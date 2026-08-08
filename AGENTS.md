# AGENTS.md

## 项目概述

本仓库是一个 Django 与 Vue 组合应用：

- Django 6.1 负责管理后台、身份认证、数据库访问和 HTTP API。
- Django SimpleUI 用于美化 `/admin/` 管理后台。
- Vue 3 与 Vite 负责 `/` 下的公开前台页面。
- Django 的 `core` 应用用于存放通用业务逻辑和当前的健康检查接口。
- 本地开发使用 SQLite 数据库。

保持前后端职责分离。面向用户的界面与交互放在 Vue 中；数据、权限、业务规则和 API 放在 Django 中。

## 仓库目录

```text
config/                  Django 项目配置与根路由
core/                    Django 主应用
frontend/                Vue/Vite 源码项目
frontend/src/            Vue 组件与样式
static/vue/              Vite 生成的构建产物，禁止直接编辑或提交
manage.py                Django 管理命令入口
requirements.txt         已锁定版本的 Python 依赖
```

## 本地环境

使用项目虚拟环境，不要使用全局 Python 环境：

```powershell
.\.venv\Scripts\python.exe --version
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

如果 `.venv` 不存在，请使用 Python 3.12 或兼容的更高版本创建虚拟环境，然后安装依赖。

在 `frontend` 目录中使用 pnpm 安装前端依赖：

```powershell
cd frontend
pnpm install --frozen-lockfile
```

禁止提交 `.venv/`、`frontend/node_modules/`、`db.sqlite3` 和 `static/vue/`。

## 开发命令

在仓库根目录运行 Django：

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

在 `frontend/` 目录运行 Vue 开发服务器：

```powershell
pnpm run dev
```

Vite 会把 `/api`、`/admin` 和 `/static` 请求代理到 8000 端口的 Django。Vite 开发服务器用于前端迭代；执行生产构建后，集成应用由 Django 统一提供。

构建由 Django 托管的 Vue 前台：

```powershell
cd frontend
pnpm run build
```

构建命令会生成 `static/vue/index.html` 和带哈希的静态资源。禁止直接编辑这些文件；应修改 `frontend/src/` 中的源码并重新构建。

## Django 集成规则

- 在 `INSTALLED_APPS` 中，必须将 `simpleui` 放在 `django.contrib.admin` 之前，确保 SimpleUI 模板能够覆盖 Django 默认后台模板。
- 除非产品需求发生变化，否则保持 `LANGUAGE_CODE = 'zh-hans'`。
- 根路由通过 Django 模板加载器渲染 Vite 生成的 `index.html`。
- JSON 接口统一放在 `/api/` 下，并为 URL 路由设置稳定的名称。
- 所有模型变更都必须创建 Django 迁移。禁止直接修改 `db.sqlite3` 来代替迁移。
- 禁止在源码中写入密码、令牌、生产密钥等敏感信息。新增配置时使用已忽略的环境变量文件，并提供不含真实机密的 `.env.example` 示例。

## 代码规范

### Python 与 Django

- 遵循 PEP 8，使用四个空格缩进。
- 视图函数应保持精简，可复用的业务逻辑应从请求处理函数中拆分出来。
- 除非有经过验证的性能需求，否则优先使用 Django ORM，不要手写 SQL。
- 导入顺序依次为标准库、第三方包、本地模块。
- 修改后端行为时，应同时添加迁移和测试。

### Vue 与 JavaScript

- 新组件使用 Vue 3 Composition API 和 `<script setup>`。
- 可复用组件应保持职责单一；页面扩展后将其放入 `frontend/src/components/`。
- API 调用应明确处理加载、成功、空数据和失败状态。
- 保持响应式布局、清晰的键盘焦点、语义化 HTML，并支持“减少动态效果”系统偏好。
- 没有明确项目需求时，不得引入第二套前端框架或额外依赖。

## 必须执行的验证

根据修改范围运行对应检查。涉及前后端的改动在交付前应运行以下全部命令：

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test
cd frontend
pnpm run build
```

修改路由、模板、静态资源或集成配置后，还需验证以下地址：

- `/` 能够返回 Vue 入口页面。
- `/api/health/` 能够返回成功的 JSON 响应。
- `/admin/` 仍能加载中文 SimpleUI 管理后台。

## 修改纪律

- 保留用户已有的无关改动，不要仅为了格式化而重写文件。
- 生成文件和本地状态不得加入 Git。
- 修改 Python 包后更新 `requirements.txt`；修改前端依赖后提交 `frontend/pnpm-lock.yaml`。
- 除非用户明确要求，否则不得创建提交、推送分支或改写 Git 历史。
