# 阶段 0：项目脚手架 — 实施计划

> 预估工时：1–2 天
> 分支名：`stage-0-project-scaffolding`

---

## 任务组 A：项目骨架初始化

### A1 初始化 Next.js

```bash
pnpm create next-app sheetsnap --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd sheetsnap
pnpm dev  # 确认 localhost:3000 正常打开
```

**产出**：一个可本地运行的 Next.js 项目（App Router + TS + Tailwind + `/src` 目录）。

### A2 添加 shadcn/ui

```bash
pnpm dlx shadcn-ui@latest init  # 选择默认配置
pnpm dlx shadcn-ui@latest add button card input label toast
```

**产出**：shadcn/ui 已配置，可使用 `Button`, `Card`, `Input`, `Label`, `Toast` 组件。

### A3 配置 ESLint + Prettier

- 启用 ESLint flat config（Next.js 自带）
- 安装 eslint-config-prettier 避免冲突
- 添加 `.prettierrc`（单引号、尾逗号、printWidth=100）
- 配置 VS Code settings.json（保存时 auto-format）

**验收**：运行 `pnpm lint` 无错误，保存文件自动格式化。

---

## 任务组 B：数据库

### B1 创建 SQL 迁移文件

在 `supabase/migrations/` 目录下创建初始迁移：

| 表 | 关键字段 | 说明 |
|----|---------|------|
| `users` | `id UUID PK`, `email`, `name`, `avatar_url`, `created_at` | 由 NextAuth.js 自动填充 |
| `parse_records` | `id UUID PK`, `user_id FK`, `guest_email`, `file_name`, `file_type`, `status`, `parsed_data JSONB`, `credit_cost`, `created_at` | 每一条解析记录；`guest_email` 用于未登录用户 |
| `payments` | `id UUID PK`, `user_id FK`, `stripe_session_id`, `amount`, `currency`, `status`, `credits_added`, `created_at` | 付款记录 |
| `feedback` | `id UUID PK`, `user_id FK`, `email`, `message`, `rating`, `page_url`, `created_at` | 用户反馈 |

**验收**：迁移文件已通过 git 管理，可在本地 Supabase 实例 `supabase start` 后成功 apply。

### B2 定义 RLS 策略

- `users`：仅本人和管理员可读
- `parse_records`：用户只能看自己的记录；未登录用户通过 `guest_email` 关联
- `payments`：仅本人可读
- `feedback`：任何人可插入，仅管理员可读

**验收**：Supabase RLS 策略在迁移文件中定义，而非手动配置。

---

## 任务组 C：认证

### C1 配置 NextAuth.js

- 安装 `next-auth` + `@auth/supabase-adapter`
- 创建 `src/app/api/auth/[...nextauth]/route.ts`
- 配置 Google OAuth Provider
- 配置 Email Provider（Resend 或 SendGrid 发送 Magic Link）
- 使用 Supabase Adapter 持久化 session 到数据库

### C2 实现登录 UI

- 页面 `/login` 使用 shadcn/ui Card 布局
- "Sign in with Google" 按钮
- "Email me a Magic Link" 输入框 + 提交按钮
- 登录成功后重定向到首页 `/`
- AuthProvider 包裹 `layout.tsx`，全局可用 `useSession()`

**验收**：
- 本地可完成 Google OAuth 登录
- 本地可接收 Magic Link 邮件并点击登录
- 登录/登出按钮在首页可见
- Session 持久化到 Supabase `users` 表

---

## 任务组 D：试用模式（不登录可用）

### D1 用量追踪（Guest 模式）

- 为未登录用户生成匿名标识 `guest_id`（localStorage UUID）
- 在 `parse_records` 表中通过 `guest_email` 和 `guest_id` 追踪
- 限制：**每日 5 次免费解析**（无需绑定邮箱，仅需留下邮箱下载时验证）

### D2 邮箱收集流程

- 解析完成后，弹出对话框："Enter your email to receive the download link"
- 收集邮箱后，记录到 `parse_records.guest_email`
- 发送下载链接邮件（可选，初期可简化：输入邮箱后直接显示下载按钮）
- 若邮箱已存在，累加其解析次数

**验收**：
- 未登录用户可上传文件（阶段 1 实现上传，阶段 0 只需 UI 入口）
- 解析成功后弹窗收集邮箱
- 输入邮箱后可下载 CSV
- 同一邮箱的解析次数可追踪

---

## 任务组 E：CI/CD

### E1 GitHub Actions 配置

文件：`.github/workflows/ci.yml`

```yaml
name: CI
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm lint
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm type-check  # tsc --noEmit
```

### E2 Vercel 自动 Preview

- 在 Vercel 中导入 GitHub 项目
- 配置 Preview 部署（每个 PR 自动生成 Preview URL）
- 设置环境变量（Supabase URL + Key, Google OAuth 等）到 Vercel 项目

**验收**：
- 创建 PR 后自动触发 CI，lint + type-check 通过
- Vercel 自动生成 Preview 部署 URL
- Preview 环境可正常打开并登录

---

## 依赖关系

```
A1 (Next.js init)
  ├─ A2 (shadcn/ui)
  └─ A3 (ESLint + Prettier)
       └─ E (CI/CD)

B (Database) ── C (Auth)
                  └─ D (Guest mode)

全部完成后 → 里程碑
```
