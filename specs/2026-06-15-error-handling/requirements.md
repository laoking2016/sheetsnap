# 阶段 2：错误处理 + 用户提示 — 需求规格

> 对应 roadmap 阶段 2。目标是让所有异常路径都有明确的用户反馈，减少客服咨询。

---

## 范围

### 包含

| 模块 | 内容 | 优先级 |
|------|------|--------|
| 文件类型校验 | 前端拖拽/点击时实时拦截非表格文件，显示内联错误提示 | P0 |
| 文件大小校验 | 前端实时拦截 >10MB 文件，显示友好提示 | P0 |
| 解析失败处理 | 空文件、无表格内容、解析超时时分别给出明确提示 | P0 |
| 单元格异常标记 | 无法映射的字段显示 ⚠️ 图标，悬浮查看原文 | P1 |
| 网络错误处理 | 上传中断 / 服务器无响应时的降级提示 | P0 |
| 全局错误边界 | 避免白屏崩溃，显示友好的错误回退界面 | P1 |
| 上传状态反馈 | 拖拽区域高亮、进度动画、解析计时 | P1 |

### 不包含

- ❌ 邮件通知解析结果
- ❌ 文件重试/重新解析（可在阶段 3 加入）
- ❌ 用户反馈表单（阶段 4 的 feedback 表）

---

## 关键决策记录

| 决策 | 选项 | 选定 | 理由 |
|------|------|------|------|
| 错误提示位置 | toast / 内联 / 弹窗 | **内联 + toast 结合** | 重要错误用内联不消失，次要提示用 toast |
| 错误边界 | React ErrorBoundary / 全局 try-catch | **React ErrorBoundary** | 标准做法，防止白屏 |
| 文件类型拦截 | 前端 accep 属性 / 服务端校验 / 两者 | **双重校验** | 前端体验好，后端防绕过 |
| 单元格异常 | 客户端标记 / 服务端标记 | **服务端标记** | 统一在 API 响应中包含 warnings 字段 |

---

## 错误场景清单

| 场景 | 前端表现 | 后端行为 | 提示文案 |
|------|---------|---------|---------|
| 上传图片 (.jpg/.png) | 拖拽不接收；点击选择器过滤 | 返回 400 | "Please upload an Excel, CSV, or PDF quotation file." |
| 上传 .txt 或其他 | 拖拽不接收；点击选择器过滤 | 返回 400 | 同上 |
| 文件 > 10MB | 拖拽时实时拒绝 | 返回 400 | "File size must not exceed 10 MB. Your file is X MB." |
| 空文件 | 显示上传成功 → 解析失败 | 返回 422 | "No data found in the file. Please check the file content." |
| 有表格但格式异常 | 显示预览 + 警告 | 返回 200 + warnings | ⚠️ "Unable to map column 'XYZ' to any standard column." |
| 网络中断 | toast "Network error" | — | "Network error. Please check your connection and try again." |
| 服务器内部错误 | toast "Something went wrong" | — | "Something went wrong. Please try again or contact support." |
