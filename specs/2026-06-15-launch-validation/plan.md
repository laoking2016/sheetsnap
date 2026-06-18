# 阶段 5：上线 & 验证 — 实施计划

> 预估工时：1–2 周
> 分支名：`stage-5-launch`

---

## 任务组 A：部署 & 域名

### A1 推送到 GitHub

- 在 GitHub 创建仓库 `sheetsnap`
- 推送所有代码
- 确认 GitHub Actions CI 通过

### A2 Vercel 部署

- 在 Vercel 导入 GitHub 仓库
- 配置环境变量（Supabase URL + Key, Google OAuth, AUTH_SECRET, LlamaParse）
- 确认 Preview 环境正常
- 确认 Production 环境正常

### A3 环境变量清理

- 在 Vercel Dashboard 配置所有环境变量
- 确认 `.env.local` 从本地开发使用但不提交

---

## 任务组 B：Landing Page

### B1 首页改版

- 更新 `src/app/page.tsx` 为正式营销页面
- 结构：
  - Hero: "Turn supplier quotes into clean CSV in seconds"
  - 上传演示区（可直接在首页操作）
  - 三步说明：Upload → Parse → Download
  - 支持格式：.xlsx .xls .csv .pdf
  - CTA: "Try it now — no signup required"

### B2 上传流程保留

- 登录用户看到 "Signed in as xxx"
- 未登录用户体验完整上传 + 预览 + 下载（不限制次数）

---

## 任务组 C：埋点分析

### C1 Vercel Analytics

- 在 Vercel Dashboard → Project → Analytics 启用
- 无需代码变更，Vercel 自动收集页面访问数据

### C2 自定义事件

- 在 `upload-zone.tsx` 中埋点：
  - `upload_started` — 用户点击上传
  - `parse_success` — 解析成功
  - `parse_failed` — 解析失败
  - `csv_downloaded` — 用户下载 CSV
- 方式：`fetch('/api/analytics', { method: 'POST', body: JSON.stringify({ event, metadata }) })`

### C3 简易 Analytics API

- 创建 `POST /api/analytics`
- 将事件写入 Supabase `feedback` 表（或新建 `analytics_events` 表）

---

## 任务组 D：解析失败收集

### D1 失败回传按钮

- 在解析失败提示下方添加 "Send file to help us improve"
- 点击后通过 Supabase Storage 上传原始文件（可选）

### D2 Feedback 表单

- 在首页添加 Feedback 链接 → 弹出对话窗口
- 写入 `feedback` 表
- 无需登录也可提交

---

## 任务组 E：推广 & 用户研究（人工操作）

### E1 Reddit 发帖

- 在 [r/procurement](https://reddit.com/r/procurement) 发帖：
  - 标题模板: "I built a free tool that turns supplier Excel/PDF quotes into clean CSV in seconds"
  - 内容说明产品价值 + 链接

### E2 Upwork 用户研究

- 在 Upwork 找 5 个采购经理/助理
- 每人 $10 礼品卡，要求录制 1 分钟使用反馈
- 收集视频 → 分析改进点

### E3 收集反馈

- 追踪 Reddit 帖子的互动（点赞、评论、私信）
- 整理 Upwork 视频反馈为改进清单

---

## 依赖关系

```
A (部署) ── B (Landing Page)
              │
              ├── C (埋点) ── 需要 A
              └── D (失败收集)
E (推广) ── 独立，可并行
```

## 成功标准

2 周后检查：

- [ ] 50 个注册用户
- [ ] 解析成功率 ≥ 85%
- [ ] 7 天回访率 ≥ 20%
- [ ] 至少 5 条用户反馈（Reddit / Upwork / 内联表单）
