# 阶段 4：计费与账户系统 — 实施计划

> 预估工时：2–3 天
> 分支名：`stage-4-billing`

---

## 任务组 A：用量追踪

### A1 用量查询函数

- 创建 `src/lib/credits.ts`
- `getCredits(userId?: string, guestEmail?: string)` — 查询当前周期已用次数
- 逻辑：从 `parse_records` 表 count 当月记录，减去 20 免费额度

### A2 用量 API

- 创建 `GET /api/credits` — 返回 `{ remaining, limit }`
- 已登录用户通过 session 识别
- 游客通过 `?email=` 查询参数识别

### A3 上传时额度校验

- 在 `POST /api/upload` 中增加前置检查
- 若已用次数 ≥ 20，返回 402 `"You have reached your monthly free limit."`

---

## 任务组 B：Stripe Checkout

### B1 安装 Stripe

```bash
pnpm add stripe @stripe/stripe-js
```

### B2 Stripe 服务端

- 创建 `src/lib/stripe.ts`
- 初始化 Stripe 客户端（`new Stripe(secret_key)`）
- 函数 `createCheckoutSession(plan, userId?, guestEmail?)`：
  - Monthly: `price_xxx` (€19/月)
  - Topup: `price_yyy` ($9.9/100 次)

### B3 创建 Checkout API

- `POST /api/checkout` — 接收 `{ plan }`，返回 Stripe Checkout URL
- 成功后重定向到 `/dashboard?paid=true`

### B4 Stripe Webhook

- `POST /api/webhook/stripe`
- 验证签名（`stripe.webhooks.constructEvent`）
- 处理 `checkout.session.completed` 事件
- 更新 `payments` 表 + 记录额度到用户

---

## 任务组 C：额度不足提示 + 定价页面

### C1 额度不足提示

- 在 `upload-zone.tsx` 中处理 402 响应
- 显示 "已达每月免费限额" + "Upgrade" 按钮跳转到定价页

### C2 定价页面

- 创建 `src/app/pricing/page.tsx`
- 三个档位对比展示（Free / Monthly / Topup）
- "Get Started" / "Subscribe" / "Buy Now" 按钮
- 点击触发 `POST /api/checkout`

---

## 任务组 D：历史记录

### D1 获取历史 API

- `GET /api/history` — 返回当前用户的 `parse_records` 列表
- 按 `created_at` 倒序排列
- 返回：`file_name`, `status`, `created_at`, `csv`（可选）

### D2 历史页面

- 创建 `src/app/history/page.tsx`
- 简单的表格展示历史解析记录
- 已登录用户可访问；游客重定向到登录

---

## 依赖关系

```
A (用量追踪)
  ├─ B (Stripe 支付) ── 需要 Stripe 账号 + API Key
  └─ C (前端提示) ── 需要 A
D (历史记录) ── 独立，优先级最低
```

## 前置条件

- [ ] Stripe 账号（https://stripe.com 注册）
- [ ] Stripe Secret Key
- [ ] Stripe Publishable Key
- [ ] 在 Stripe Dashboard 创建两个 Pricing 产品：
  - Monthly: $19/月，200 次
  - Topup: $9.9，100 次
- [ ] Stripe CLI（本地 Webhook 测试用）
