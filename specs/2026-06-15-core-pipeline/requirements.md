# 阶段 1：核心链路 — 需求规格

> 对应 roadmap 阶段 1，是 Sheetsnap 的核心价值链路：上传 → 解析 → CSV 下载。

---

## 范围

### 包含

| 模块 | 内容 | 优先级 |
|------|------|--------|
| 文件上传 UI | 拖拽 + 点击上传（单文件，≤10MB），支持 .xlsx/.xls/.csv/.pdf | P0 |
| 文件上传 API | `POST /api/upload` — 接收文件、校验类型/大小、返回解析结果 | P0 |
| 文档解析 | 接入 LlamaParse API，将 Excel/PDF 转为结构化文本 | P0 |
| 列映射引擎 | 从原始表格数据提取到标准 5 列（产品名称、规格、单价、最小起订量、货币） | P0 |
| 单位归一化 | 将常见单位（pcs→个, kg→公斤）映射为标准中文；无法识别的保留原文并标记 ⚠️ | P1 |
| CSV 生成 | 生成 UTF-8 BOM CSV，兼容 Excel 打开 | P0 |
| 结果预览 | 在线表格展示前 10 行，异常单元格标记 ⚠️ | P1 |
| 下载按钮 | 解析成功后显示 "Download CSV" | P0 |

### 不包含

- ❌ PDF 扫描图片 OCR（手写/拍照报价单）
- ❌ 多文件批量上传
- ❌ 解析历史记录（阶段 4）
- ❌ 用户登录后的用量追踪（阶段 0 已预留表结构，但业务逻辑在阶段 4）

---

## 关键决策记录

| 决策 | 选项 | 选定 | 理由 |
|------|------|------|------|
| 解析 API | LlamaParse / Unstructured.io | **LlamaParse** | 专门处理表格类文档，有免费额度，API 简洁 |
| 文件存储 | 内存暂存 / S3 | **内存暂存，处理完即删** | 保护用户数据隐私，MVP 阶段无需持久化 |
| 列映射策略 | 纯规则 / LLM / 规则+LLM | **规则引擎优先，LLM 兜底** | 规则引擎对已知格式快且准，LLM 处理未知格式 |
| 文件解析时机 | 上传后立即 / 排队异步 | **上传后立即同步解析** | MVP 阶段量小，5 秒内返回即可 |
| CSV 编码 | UTF-8 / UTF-8 BOM | **UTF-8 BOM** | Excel for Windows 打开 UTF-8 无 BOM 会乱码 |

---

## 数据模型

### 标准输出列

| 列名 | 类型 | 说明 | 必需 |
|------|------|------|------|
| 产品名称 | string | 产品的中文/英文名称 | ✅ |
| 规格 | string | 型号、尺寸、参数等 | ✅ |
| 单价 | number | 单个产品价格 | ✅ |
| 最小起订量 | number\|string | MOQ (Minimum Order Quantity) | ✅ |
| 货币 | string | USD, CNY, EUR 等 | ✅ |
| 其他信息 | string | 无法映射到标准列的原始内容 | ❌ |

### 单位映射表（内置）

| 原文 | 标准输出 |
|------|---------|
| pcs, piece, pieces, ea, each | 个 |
| kg, kilogram, kilograms | 公斤 |
| g, gram, grams | 克 |
| m, meter, meters | 米 |
| cm, centimeter, centimeters | 厘米 |
| mm, millimeter, millimeters | 毫米 |
| l, liter, liters | 升 |
| box, boxes, carton, cartons | 箱 |
| set, sets | 套 |
| pair, pairs | 对 |
| roll, rolls | 卷 |
| doz, dozen, dozens | 打 |

---

## API 设计

### POST /api/upload

```
Content-Type: multipart/form-data
Body: { file: File }

Response 200:
{
  "success": true,
  "columns": ["产品名称", "规格", "单价", "最小起订量", "货币", "其他信息"],
  "rows": [
    { "产品名称": "...", "规格": "...", "单价": 1.23, "最小起订量": 100, "货币": "USD", "其他信息": "" },
    ...
  ],
  "warnings": [
    { "row": 2, "column": "单位", "message": "无法识别的单位: 'lbs'，已保留原文" }
  ]
}

Response 400:
{
  "success": false,
  "error": "请上传 Excel 或 PDF 格式的报价单"
}

Response 422:
{
  "success": false,
  "error": "未能识别出表格，你可以手动复制粘贴，或联系我们帮你优化"
}
```
