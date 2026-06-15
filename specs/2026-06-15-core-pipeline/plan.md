# 阶段 1：核心链路 — 实施计划

> 预估工时：3–5 天
> 分支名：`stage-1-core-pipeline`

---

## 任务组 A：文件上传

### A1 文件上传 UI

- 在 `src/components/upload-zone.tsx` 中实现拖拽 + 点击上传
- 使用 `react-dropzone`（或 shadcn 内置的上传组件）
- 限制：单个文件，≤10MB，类型 `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (xlsx), `application/vnd.ms-excel` (xls), `text/csv`, `application/pdf`
- 上传中显示进度指示器
- 上传完成后自动触发解析

### A2 文件上传 API

- 创建 `src/app/api/upload/route.ts`
- 用 `next/formidable` 或 Web API `Request.formData()` 接收文件
- 校验：
  - 文件大小 ≤ 10MB
  - 扩展名/Content-Type 在允许列表中
- 暂存到内存（使用 `Buffer`）
- 调用解析流水线（A3–A5）
- 返回 JSON 结果

**产出**：`POST /api/upload` 可接收文件，校验通过后返回解析结果。

---

## 任务组 B：文档解析

### B1 安装 LlamaParse

```bash
pnpm add llamaindex  # 或者直接使用 REST API
```

或直接调用 LlamaParse REST API（更轻量）：

```bash
pnpm add formidable
```

### B2 创建 LlamaParse Service

- 创建 `src/lib/parse.ts`
- 封装 LlamaParse API 调用
- 输入：文件 Buffer + 文件名
- 输出：结构化文本（markdown 表格格式）
- 错误处理：API 超时、返回空结果等情况

### B3 原始数据提取

- 从 LlamaParse 输出的 markdown 表格中提取行/列
- 解析为 `{ headers: string[], rows: string[][] }` 结构
- 若输出不是表格格式，返回错误

**产出**：给定一个 Excel/PDF 报价单，返回原始行列数据。

---

## 任务组 C：列映射 + 数据清洗

### C1 列映射引擎

- 创建 `src/lib/column-mapper.ts`
- 规则匹配（按优先级）：
  1. 精确匹配关键词（"产品名称"→name, "Unit Price"→单价, "MOQ"→最小起订量）
  2. 模糊匹配（包含关键词）
  3. 回退：LLM 辅助映射（可选，MVP 先用纯规则）
- 映射到标准 5 列

### C2 单位归一化

- 创建 `src/lib/unit-normalizer.ts`
- 内置映射表（见 requirements.md）
- 无法识别的单位保留原文并标记警告
- 区分大小写、去除空格/括号后的单位

### C3 数据清洗

- 去除空行/全空列
- 尝试将字符串价格转为数字（去除货币符号、千位分隔符）
- 识别货币符号（$, €, £ → USD, EUR, GBP）

**产出**：输入原始行列数据 → 输出标准 5 列 JSON。

---

## 任务组 D：CSV 生成 + 下载

### D1 CSV 生成

- 创建 `src/lib/csv-generator.ts`
- 使用 UTF-8 BOM 编码
- 使用 `\ufeff` BOM 头 + 逗号分隔 + 双引号转义
- 列顺序：产品名称、规格、单价、最小起订量、货币、其他信息

### D2 结果预览组件

- 更新 `src/components/upload-zone.tsx`
- 解析成功后显示表格预览（前 10 行）
- 使用 shadcn Table 组件
- 无法映射/无法识别的单元格显示 ⚠️ 图标
- 悬浮 ⚠️ 显示原文 tooltip

### D3 下载按钮

- 解析成功后显示 "Download CSV" 按钮
- 点击触发 Blob 下载
- 文件名：`{原始文件名}_sheetsnap.csv`

**产出**：用户上传 → 预览 → 点击下载 → 得到 CSV 文件。

---

## 依赖关系

```
A1 (上传 UI) ── A2 (上传 API)
                  │
                  ▼
              B (解析) ── C (列映射 + 清洗)
                              │
                              ▼
                          D (CSV 生成 + 下载)
```

## 里程碑

所有任务完成后，用户应该可以：

1. 打开首页
2. 拖拽或点击上传一个 Excel/PDF 报价单
3. 看到表格预览（前 10 行）
4. 点击 "Download CSV"
5. 得到 UTF-8 BOM 编码的 CSV 文件
6. 用 Excel 打开不乱码
