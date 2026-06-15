# Sheetsnap — 技术选型

> 总原则：**低成本快速验证** — 使用成熟 SaaS / PaaS 服务，不自己造轮子，MVP 阶段尽量压到 \$0 基础设施成本。

---

## 前端

| 技术 | 版本要求 | 选型理由 |
|------|---------|---------|
| **Next.js (React)** | 14+ (App Router) | 前后端一体，快速开发，部署到 Vercel 免费 |
| **Tailwind CSS** | 3+ | 快速出 UI，无需写自定义 CSS |
| **TypeScript** | 5+ | 类型安全，减少运行时错误 |

## 后端

| 技术 | 选型理由 |
|------|---------|
| **Next.js API Routes** | 无需单独服务器，和前端同一项目部署 |
| **Supabase (PostgreSQL)** | 免费额度足够 MVP：数据库 + 认证 + 存储 |
| **NextAuth.js** | 集成 Google OAuth / 邮箱注册，一行配一个 Provider |

## 文件处理

| 环节 | 方案 | 说明 |
|------|------|------|
| 文件上传 | 直接通过 Next.js API 接收 `multipart/form-data` | 暂存内存，处理完即删 |
| 文件存储 | **不做持久化** | 保护用户数据隐私；如需保留历史可启用 Supabase Storage |
| 文件大小限制 | 单文件 ≤ 10MB | 防止滥用，控制解析 API 费用 |

## 核心解析

| 层 | 方案 | 说明 |
|----|------|------|
| **表格识别** | **LlamaParse** (by LlamaIndex) 或 **Unstructured.io** | 专门处理非结构表格，准确率高，有免费额度 |
| **列映射** | 自研规则引擎（JavaScript） | 将原始列名映射到标准 5 列：产品名称、规格、单价、最小起订量、货币 |
| **单位归一化** | 规则映射表 + 保底回退 | "pcs"→"个"，"kg"→"公斤"，无法识别的保留原文并标记 ⚠️ |
| **备选方案** | Surya-OCR + Table Transformer | 开源自部署，仅在 API 成本过高时切换 |

> **不自己训练模型。** 价值在于"针对 B2B 报价单场景的列映射和单位归一化"，不是底层 OCR。

## 支付

| 技术 | 选型理由 |
|------|---------|
| **Stripe Checkout** | 海外支付标准，不需要 PCI 认证 |

## 部署

| 平台 | 用途 | 说明 |
|------|------|------|
| **Vercel** | Web 应用托管 | 免费额度足够 MVP |
| **Supabase** | 数据库 + 认证 | 免费 500MB 数据库 |
| **GitHub** | 源码管理 + CI/CD | 免费 |

## 技术架构图（概念）

```
用户浏览器
    │
    ▼   HTTPS
Vercel (Next.js App)
    ├── /app → 前端页面 (React Server Components)
    ├── /api → API Routes
    │       ├── POST /api/upload    → 接收文件 → 调用 LlamaParse → 清洗 → 返回 CSV
    │       ├── POST /api/auth/*    → NextAuth.js 认证
    │       └── POST /api/checkout  → Stripe 支付
    │
    ├── Supabase (PostgreSQL)  ← 用户 / 用量 / 支付记录
    └── LlamaParse API        ← 文档解析（外部调用）
```

## 环境变量（MVP 必须）

```env
# 数据库
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# 认证
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# 解析
LLAMA_PARSE_API_KEY=

# 支付
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```
