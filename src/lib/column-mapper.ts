export interface ColumnMappingResult {
  /** Indices into the original rows for each standard column (-1 = not found) */
  columnIndices: {
    productName: number;
    spec: number;
    unitPrice: number;
    moq: number;
    currency: number;
  };
  rows: Record<string, string>[];
  warnings: { row: number; column: string; message: string }[];
}

/**
 * Standard output columns
 */
const STANDARD_COLUMNS = [
  '产品名称',
  '规格',
  '单价',
  '最小起订量',
  '货币',
  '其他信息',
] as const;

/**
 * Keyword patterns for matching input columns to standard columns.
 * Ordered by priority (first match wins).
 */
const COLUMN_PATTERNS: { target: string; patterns: RegExp[] }[] = [
  {
    target: '产品名称',
    patterns: [
      /product\s*name/i,
      /产品名称/i,
      /品名/i,
      /item/i,
      /description/i,
      /产品名/i,
      /物料名称/i,
      /part\s*name/i,
      /product/i,
    ],
  },
  {
    target: '规格',
    patterns: [
      /规格/i,
      /spec/i,
      /specification/i,
      /型号/i,
      /model/i,
      /尺寸/i,
      /dimension/i,
      /parameter/i,
    ],
  },
  {
    target: '单价',
    patterns: [
      /unit\s*price/i,
      /单价/i,
      /price/i,
      /unitprice/i,
      /报价/i,
    ],
  },
  {
    target: '最小起订量',
    patterns: [
      /moq/i,
      /min\s*order/i,
      /最小起订量/i,
      /minimum\s*order/i,
      /起订量/i,
      /订货量/i,
      /min\s*qty/i,
      /order\s*qty/i,
      /qty/i,
      /quantity/i,
    ],
  },
  {
    target: '货币',
    patterns: [
      /currency/i,
      /货币/i,
      /币别/i,
      /币种/i,
    ],
  },
];

/**
 * Map input headers/rows to standard 5+1 columns.
 */
export function mapColumns(
  headers: string[],
  rows: string[][],
): ColumnMappingResult {
  const warnings: ColumnMappingResult['warnings'] = [];
  const columnIndices: ColumnMappingResult['columnIndices'] = {
    productName: -1,
    spec: -1,
    unitPrice: -1,
    moq: -1,
    currency: -1,
  };

  // ── Match headers ──
  const matchedTargets = new Set<string>();

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].trim();

    for (const rule of COLUMN_PATTERNS) {
      if (matchedTargets.has(rule.target)) continue;

      if (rule.patterns.some((p) => p.test(header))) {
        const key = getColumnKey(rule.target);
        if (key && key in columnIndices) {
          (columnIndices as Record<string, number>)[key] = i;
          matchedTargets.add(rule.target);
        }
        break;
      }
    }
  }

  // ── Warnings for unmapped columns ──
  for (let i = 0; i < headers.length; i++) {
    if (!Object.values(columnIndices).includes(i)) {
      warnings.push({
        row: 0,
        column: headers[i],
        message: `Column "${headers[i]}" was not mapped to any standard column. Data preserved in "其他信息".`,
      });
    }
  }

  // ── Transform rows ──
  const mappedRows = rows.map((row, rowIdx) => {
    const mapped: Record<string, string> = {};

    for (const col of STANDARD_COLUMNS) {
      mapped[col] = '';
    }

    // Extract standard columns
    const getValue = (idx: number) => (idx >= 0 && idx < row.length ? row[idx].trim() : '');
    mapped['产品名称'] = getValue(columnIndices.productName);
    mapped['规格'] = getValue(columnIndices.spec);
    mapped['单价'] = getValue(columnIndices.unitPrice);
    mapped['最小起订量'] = getValue(columnIndices.moq);
    mapped['货币'] = getValue(columnIndices.currency);

    // ── Warning: unparseable price ──
    const priceStr = mapped['单价'];
    if (priceStr && isNaN(Number(priceStr.replace(/[$,€£¥]/g, '')))) {
      warnings.push({
        row: rowIdx,
        column: '单价',
        message: `Unable to parse price value: "${priceStr}".`,
      });
    }

    // Collect other values as "其他信息"
    const other: string[] = [];
    for (let i = 0; i < row.length; i++) {
      if (!Object.values(columnIndices).includes(i) && row[i].trim()) {
        other.push(`${headers[i]}: ${row[i].trim()}`);
      }
    }
    mapped['其他信息'] = other.join('; ');

    return mapped;
  });

  return {
    columnIndices,
    rows: mappedRows,
    warnings,
  };
}

function getColumnKey(target: string): string | null {
  const map: Record<string, string> = {
    '产品名称': 'productName',
    '规格': 'spec',
    '单价': 'unitPrice',
    '最小起订量': 'moq',
    '货币': 'currency',
  };
  return map[target] || null;
}
