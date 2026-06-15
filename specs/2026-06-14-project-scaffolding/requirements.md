# 阶段 0：项目脚手架 — 需求规格

> 对应 roadmap 阶段 0，是 Sheetsnap 项目的第一块基石。

---

## 范围

### 包含

| 模块 | 内容 | 来源决策 |
|------|------|---------|
| Next.js 初始化 | pnpm, App Router, TypeScript, Tailwind CSS, `/src` 目录结构 | 用户确认 |
| UI 组件库 | shadcn/ui（基于 Tailwind + Radix UI） | 用户确认 |
| 代码规范 | ESLint + Prettier（保存时自动格式化） | roadmap 0.2 |
| 数据库 | Supabase (PostgreSQL)，原始 SQL 迁移文件管理 | 用户确认 |
| 数据库表 | `users`, `parse_records`, `payments`, `feedback` | 用户确认 |
| 认证 | NextAuth.js with Google OAuth + Email（Magic Link） | 用户确认 |
| 试用模式 | 不登录也可使用，解析后收集邮箱提供下载 | 用户确认 |
| CI/CD | GitHub Actions: lint + type-check + Vercel Preview 自动部署 | 用户确认 |
| 部署 | Vercel（默认 `.vercel.app` 域名） | 用户确认 |

### 不包含（明确排除）

- ❌ 文件上传 UI 和 API（阶段 1）
- ❌ LlamaParse 解析集成（阶段 1）
- ❌ CSV 生成与下载（阶段 1）
- ❌ 在线表格预览（阶段 3）
- ❌ Stripe 支付集成（阶段 4）
- ❌ 自定义域名绑定

---

## 关键决策记录

| 决策 | 选项 | 选定 | 理由 |
|------|------|------|------|
| 包管理器 | npm / yarn / pnpm | **pnpm** | Vercel 原生支持，速度快，依赖隔离好 |
| 目录结构 | 根目录 / `/src` | **`/src`** | 与 Next.js 官方推荐一致，便于后续扩展 |
| UI 组件库 | 自写 / shadcn/ui / MUI | **shadcn/ui** | 与 Tailwind 深度集成，只复制用到的组件，体积小 |
| 认证 Providers | Google only / Google+Email | **Google + Email Magic Link** | Magic Link 无需密码，降低注册摩擦 |
| 试用模式 | 强制注册 / 不注册可用 | **不注册可用** | MVP 阶段降低用户试用门槛，先收集邮箱 |
| 数据库管理 | Dashboard / SQL 迁移 | **原始 SQL 迁移文件** | 可版本控制，可追溯，团队成员一致 |
| 额外表 | 仅 users+parse_records / +payments+feedback | **+payments+feedback** | 支付和反馈表提前设计，避免后续 migration 冲突 |
| 域名 | 自定义 / Vercel 默认 | **Vercel 默认域名** | 阶段 0 不增加域名配置成本，后续再绑定 |
| CI | 无 / GitHub Actions | **GitHub Actions** | lint + type-check + 自动部署 Preview |

---

## 背景

- Sheetsnap 是一个"报价单 → 标准 CSV"的 B2B SaaS 工具，面向海外中小采购团队。
- 阶段 0 的目标是搭建好技术基础设施，使得团队可以在干净的框架上快速迭代阶段 1 的核心功能。
- 所有技术选型遵循 README.md 中的"低成本快速验证"原则，尽量使用免费额度。
- 试用模式是获取早期用户的关键策略：用户无需注册即可体验核心价值，仅在获取解析结果时提供邮箱，降低转化的心理门槛。
