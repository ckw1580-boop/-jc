# AGENTS.md

## 项目概述

本仓库是部署在 Netlify 的 Vue 3 全栈应用：

- Vue 3 与 Vite 提供公开工业控制台和反馈管理界面。
- Netlify Functions 提供 `/api/` 下的 HTTP API。
- Netlify Database 保存结构化问题反馈。
- Netlify Blobs 保存用户上传的图片附件。
- Netlify Identity 使用邀请制账户和 `admin` 角色保护反馈后台。

项目不再使用 Django、SimpleUI、SQLite 或 Python 运行时。

## 仓库目录

```text
frontend/                         Vue/Vite 源码
frontend/src/views/admin/         反馈管理页面
netlify/functions/                Netlify Functions
netlify/functions/_shared/        API 共享验证、认证和存储逻辑
netlify/database/migrations/      Netlify Database SQL 迁移
netlify.toml                      构建、路由、Functions 与安全头配置
pnpm-workspace.yaml               pnpm 工作区和构建脚本许可
```

`frontend/dist/`、`.netlify/` 和 `node_modules/` 是本地生成状态，禁止直接编辑或提交。

## 本地环境

使用 Node.js 22 和仓库声明的 pnpm 版本：

```powershell
pnpm install --frozen-lockfile
pnpm run dev
```

`pnpm run dev` 通过 Netlify Dev 同时启动 Vite、Functions、Database 和本地 Blobs。Netlify Identity 当前不能在本地模拟，管理员登录必须使用 Deploy Preview 或生产部署测试。

## 开发规则

- 新 Function 使用现代 `default export` 与 `Config` 语法；Identity 事件函数是唯一允许使用旧式 `handler` 导出的例外。
- API 使用稳定的 `/api/` 路径，统一返回 JSON 错误结构和 `requestId`。
- 所有公开输入必须在 Function 中重新校验，不得只依赖前端校验。
- 反馈文字字段保存在 `shujufankui`，图片二进制只保存在 `feedback-images` Blob Store。
- Blob Key 必须由服务端生成，不得直接使用用户文件名。
- 管理 API 必须同时校验 Identity 登录状态和 `admin` 角色。
- Database 结构变更必须新增 `netlify/database/migrations/` SQL 文件，不得改写已经发布的迁移。
- 密钥、管理员邮箱和其他部署配置使用 Netlify 环境变量，不得写入前端 `VITE_` 变量或源码。

## Vue 规范

- 使用 Vue 3 Composition API 与 `<script setup>`。
- 公共页面、管理页面和 API 状态必须处理加载、成功、空数据和失败状态。
- 保持语义化 HTML、键盘焦点、移动端响应式布局和减少动态效果支持。
- History 路由由 `netlify.toml` 的 SPA 回退支持；旧 Hash 地址只在启动兼容逻辑中处理。

## 必须执行的验证

```powershell
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run netlify:build
```

Database 迁移在已链接的 Netlify 项目中验证：

```powershell
pnpm exec netlify database migrations apply
pnpm exec netlify database status
```

部署前还需验证：

- `/` 和直接刷新的 History 子路由返回 Vue 页面。
- `/api/health` 返回成功 JSON。
- 反馈可以提交 0–5 张合规图片，非法输入被服务端拒绝。
- 未登录管理 API 返回 401，非管理员返回 403。
- 管理员可以搜索、查看、下载和删除反馈。
- Deploy Preview 的 Identity 邀请与管理员角色生效。

## Git 与部署

- 生产分支为 `master`，由 GitHub 推送触发 Netlify 生产部署。
- 功能分支先使用 Deploy Preview 验证 Database 分支和 Identity。
- 禁止提交 `.netlify/`、构建产物、数据库凭据和环境变量文件。
- 保留用户已有的无关改动；除非用户明确要求，不得改写 Git 历史。
