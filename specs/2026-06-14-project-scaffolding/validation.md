# 阶段 0：项目脚手架 — 验证标准

> 所有任务完成后，依次执行以下验证。全部通过则此阶段可合并至 `main`。

---

## 验证 1：项目基础

| # | 检查项 | 操作 | 预期结果 |
|---|--------|------|---------|
| V1.1 | pnpm 安装 | `pnpm install` | 无错误，无依赖缺失 |
| V1.2 | 本地开发服务器 | `pnpm dev` 后访问 `http://localhost:3000` | 首页正常渲染，无控制台错误 |
| V1.3 | `/src` 目录结构 | `ls src/` | 包含 `app/`, `components/`, `lib/` 等 |
| V1.4 | lint 通过 | `pnpm lint` | 0 errors, 0 warnings |
| V1.5 | type-check 通过 | `pnpm type-check`（`tsc --noEmit`） | 0 errors |
| V1.6 | shadcn/ui 组件可用 | 在首页使用 `Button`, `Card` 组件 | 渲染正常，样式与 shadcn 一致 |

## 验证 2：数据库

| # | 检查项 | 操作 | 预期结果 |
|---|--------|------|---------|
| V2.1 | 迁移可执行 | `supabase migration up` 或手动执行 SQL | 所有表创建成功 |
| V2.2 | 表结构 | 检查 `users`, `parse_records`, `payments`, `feedback` | 4 张表均存在，字段与迁移文件一致 |
| V2.3 | RLS 已启用 | `SELECT relname FROM pg_class WHERE relrowsecurity = true` | 4 张表均已启用 |
| V2.4 | 迁移文件可追溯 | `git log supabase/migrations/` | 迁移文件在 git 历史中 |

## 验证 3：认证

| # | 检查项 | 操作 | 预期结果 |
|---|--------|------|---------|
| V3.1 | Google OAuth 登录 | 点击 "Sign in with Google" | 跳转到 Google 授权页，授权后回跳至首页 |
| V3.2 | Magic Link 登录 | 输入邮箱 → 点击发送 | 收到邮件，点击链接后成功登录 |
| V3.3 | Session 持久化 | 登录后刷新页面 | 保持登录状态 |
| V3.4 | Session 持久化到 DB | 登录后检查 Supabase `users` 表 | 用户记录已写入 |
| V3.5 | 登出 | 点击登出按钮 | Session 清除，返回未登录状态 |
| V3.6 | 登录路由保护 | 访问受保护的页面 | 未登录时重定向到 `/login` |

## 验证 4：试用模式

| # | 检查项 | 操作 | 预期结果 |
|---|--------|------|---------|
| V4.1 | 匿名标识 | 打开 DevTools → Application → localStorage | `guest_id` 已生成（UUID 格式） |
| V4.2 | 上传入口可见 | 首页未登录状态下 | "Upload Quotation File" 按钮可点击 |
| V4.3 | 邮箱收集弹窗 | 模拟解析完成后 | 弹出 "Enter your email" 对话框 |
| V4.4 | 邮箱存储 | 输入邮箱并确认 | `parse_records` 表 `guest_email` 字段正确写入 |
| V4.5 | 下载可用 | 输入邮箱后 | 下载按钮可用，点击后下载 CSV |

## 验证 5：CI/CD

| # | 检查项 | 操作 | 预期结果 |
|---|--------|------|---------|
| V5.1 | CI 自动触发 | 推送分支 → 创建 PR | GitHub Actions 自动运行 `lint` 和 `type-check` |
| V5.2 | CI 通过 | 等待 CI 完成 | 两个 job 均为绿色 ✅ |
| V5.3 | Vercel Preview | 前往 PR 页面 → 点击 "Visit Preview" | Preview 环境正常打开 |
| V5.4 | Preview 认证可用 | 在 Preview 环境登录 | Google OAuth 和 Magic Link 均正常工作 |
| V5.5 | Preview 数据库连接 | 检查 Preview 环境 API | 可正常读写 Supabase |

---

## 合并条件

当且仅当**所有项目符号均通过**时，此阶段可合并至 `main`：

- [ ] V1.1 – V1.6 (项目基础 ✅)
- [ ] V2.1 – V2.4 (数据库 ✅)
- [ ] V3.1 – V3.6 (认证 ✅)
- [ ] V4.1 – V4.5 (试用模式 ✅)
- [ ] V5.1 – V5.5 (CI/CD ✅)

**合并命令**：

```bash
git checkout main
git merge stage-0-project-scaffolding
git push origin main
```
