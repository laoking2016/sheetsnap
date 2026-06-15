# 阶段 4：计费与账户系统 — 需求规格

> 对应 roadmap 阶段 4。目标：注册用户拥有每月免费额度，超出后可付费，收入闭环。

---

## 范围

### 包含

| 模块 | 内容 | 优先级 |
|------|------|--------|
| 用量追踪 | 每用户（已登录）/每邮箱（游客）每月解析次数计数 | P0 |
| 额度限制 | 免费层每月 20 次，达限后阻止上传 | P0 |
| Stripe 支付 | Stripe Checkout 集成 — 两个定价档位 | P0 |
| 额度充值 | 支付成功后更新用户/邮箱的剩余次数 | P0 |
| 历史记录 | 已登录用户查看自己的解析记录列表 | P1 |
| 定价页面 | 展示免费层和付费层对比的定价页面 | P1 |

### 定价档位

| 档位 | 价格 | 次数 | 说明 |
|------|------|------|------|
| Free | $0 | 20 次/月 | 无需绑定信用卡，仅需邮箱 |
| Monthly | $19/月 | 200 次/月 | 超出按 $0.1/次 |
| Pay-as-you-go | $9.9 | 100 次（永不失效） | 一次性购买 |

### 不包含

- ❌ 企业定制套餐（$99/月，含 API）
- ❌ 团队协作 / 权限管理
- ❌ 自动续费提醒邮件
- ❌ 发票/收据下载

---

## 关键决策记录

| 决策 | 选项 | 选定 | 理由 |
|------|------|------|------|
| 支付提供商 | Stripe / Paddle / LemonSqueezy | **Stripe** | 海外标准，与 README.md 一致 |
| 计费模型 | 订阅 / 按量 / 混合 | **混合** | 月付订阅 + 按量包，覆盖不同用户习惯 |
| 额度存储 | Supabase `parse_records` 表聚合 / Redis | **Supabase 聚合查询** | MVP 阶段无需额外缓存，直接 SQL count |
| 游客计费 | 不追踪 / 按邮箱 / 按 IP | **按邮箱** | 已通过 `GuestEmailDialog` 收集邮箱 |
| Stripe 模式 | Checkout / PaymentElement | **Stripe Checkout** | 托管页面，无需 PCI 认证，快速集成 |
| Webhook | 本地开发用 Stripe CLI / 生产用 Vercel | **两者** | Stripe CLI 转发本地事件 |

---

## 数据模型（已有表）

### parse_records 表（已有）

| 字段 | 用途 |
|------|------|
| `user_id` | 已登录用户关联 |
| `guest_email` | 游客邮箱 |
| `credit_cost` | 本次解析消耗的额度（固定 1） |
| `created_at` | 解析时间 |

### payments 表（已有）

| 字段 | 用途 |
|------|------|
| `user_id` / `guest_email` | 付款人 |
| `stripe_session_id` | Stripe 会话 ID |
| `amount` | 金额（分） |
| `credits_added` | 购买的次数 |
| `status` | completed / failed / refunded |

---

## API 设计

### GET /api/credits

获取当前用户/邮箱的剩余解析次数。

```
Response 200:
{
  "remaining": 15,
  "limit": 20,
  "period": "monthly"
}
```

### POST /api/checkout

创建 Stripe Checkout 会话。

```
Body: { "plan": "monthly" | "topup" }
Response 200:
{
  "url": "https://checkout.stripe.com/..."
}
```

### POST /api/webhook/stripe

Stripe Webhook 回调 — 处理支付成功事件。

```
Stripe Event: checkout.session.completed
→ 更新 payments 表
→ 增加用户/邮箱的可用额度
```
