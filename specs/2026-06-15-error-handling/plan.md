# 阶段 2：错误处理 + 用户提示 — 实施计划

> 预估工时：1–2 天
> 分支名：`stage-2-error-handling`

---

## 任务组 A：前端校验强化

### A1 文件类型实时拦截

- 在 `upload-zone.tsx` 的 `onDrop` 中增加前置校验
- 拒绝非白名单扩展名的文件，显示内联错误
- 完善 `accept` prop 配置

### A2 文件大小实时反馈

- 上传前在 `onDrop` 中检查 `file.size > 10MB`
- 显示具体超出的尺寸："File size must not exceed 10 MB. Your file is 15.2 MB."

---

## 任务组 B：解析失败处理

### B1 空文件识别

- 在 `parse.ts` 的 `parseCsv` 和 `mockParse` 中增加文件为空判断
- API 返回 422 时前端展示友好提示

### B2 后端错误分类

- 在 `upload/route.ts` 中细化错误分类：
  - `NO_FILE` → 400
  - `WRONG_TYPE` → 400
  - `TOO_LARGE` → 400 + 显示实际大小
  - `PARSE_FAILED` → 422
  - `EMPTY_FILE` → 422
  - `SERVER_ERROR` → 500

### B3 前端错误展示

- 每种错误用不同的内联提示样式（非 toast 不消失）
- 添加重试按钮

---

## 任务组 C：单元格异常标记

### C1 列映射警告

- 在 `column-mapper.ts` 中实现 warning 生成：
  - 未被映射的列
  - 无法解析的数字（如单价含字母）
  - 未被识别的货币符号

### C2 前端展示

- 预览表格中的 ⚠️ 图标已实现，确认悬浮 tooltip 正常工作
- 底部警告区域展示所有警告详情

---

## 任务组 D：错误边界

### D1 全局 ErrorBoundary

- 创建 `src/components/error-boundary.tsx`
- 包裹 `layout.tsx` 中的 `children`
- 捕获渲染错误，显示降级 UI

---

## 依赖关系

```
A (前端校验) ── 快速 win，0.5 天
B (解析失败) ── 依赖现有 API 结构，0.5 天
C (异常标记) ── 依赖列映射引擎，0.5 天
D (错误边界) ── 独立，0.5 天
```
