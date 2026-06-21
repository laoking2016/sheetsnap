export interface ColumnMappingResult {
  columnIndices: {
    productName: number;
    spec: number;
    unitPrice: number;
    moq: number;
    currency: number;
    amount: number;
  };
  rows: Record<string, string>[];
  warnings: { row: number; column: string; message: string }[];
}

/**
 * Standard output column names matching QUOTE_SCHEMA.
 */
const STANDARD_COLUMNS = [
  'description',
  'model',
  'unit_price',
  'quantity',
  'currency',
  'amount',
] as const;

/**
 * Keyword patterns for matching input columns to standard columns.
 */
const COLUMN_PATTERNS: { target: string; patterns: RegExp[] }[] = [
  {
    target: 'description',
    patterns: [
      /description/i,
      /product\s*name/i,
      /产品名称/i,
      /品名/i,
      /item/i,
      /产品名/i,
      /物料名称/i,
      /product/i,
      /name/i,
    ],
  },
  {
    target: 'model',
    patterns: [
      /model/i,
      /spec/i,
      /specification/i,
      /规格/i,
      /型号/i,
      /尺寸/i,
      /dimension/i,
      /parameter/i,
    ],
  },
  {
    target: 'unit_price',
    patterns: [
      /unit\s*price/i,
      /unitprice/i,
      /单价/i,
      /price/i,
      /报价/i,
    ],
  },
  {
    target: 'quantity',
    patterns: [
      /quantity/i,
      /moq/i,
      /min\s*order/i,
      /qty/i,
      /最小起订量/i,
      /minimum\s*order/i,
      /起订量/i,
      /order\s*qty/i,
    ],
  },
  {
    target: 'currency',
    patterns: [
      /currency/i,
      /货币/i,
      /币别/i,
      /币种/i,
    ],
  },
  {
    target: 'amount',
    patterns: [
      /amount/i,
      /total/i,
      /金额/i,
      /总计/i,
    ],
  },
];

/**
 * Map input headers/rows to standard columns matching QUOTE_SCHEMA.
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
    amount: -1,
  };

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

  // Warnings for unmapped columns
  for (let i = 0; i < headers.length; i++) {
    if (!Object.values(columnIndices).includes(i)) {
      warnings.push({
        row: 0,
        column: headers[i],
        message: `Column "${headers[i]}" was not mapped.`,
      });
    }
  }

  // Transform rows
  const mappedRows = rows.map((row, rowIdx) => {
    const mapped: Record<string, string> = {};

    for (const col of STANDARD_COLUMNS) {
      mapped[col] = '';
    }

    const getValue = (idx: number) => (idx >= 0 && idx < row.length ? row[idx].trim() : '');
    mapped['description'] = getValue(columnIndices.productName);
    mapped['model'] = getValue(columnIndices.spec);
    mapped['unit_price'] = getValue(columnIndices.unitPrice);
    mapped['quantity'] = getValue(columnIndices.moq);
    mapped['currency'] = getValue(columnIndices.currency);
    mapped['amount'] = getValue(columnIndices.amount);

    // Warning: unparseable price
    const priceStr = mapped['unit_price'];
    if (priceStr && isNaN(Number(priceStr.replace(/[$,€£¥]/g, '')))) {
      warnings.push({
        row: rowIdx,
        column: 'unit_price',
        message: `Unable to parse price value: "${priceStr}".`,
      });
    }

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
    'description': 'productName',
    'model': 'spec',
    'unit_price': 'unitPrice',
    'quantity': 'moq',
    'currency': 'currency',
    'amount': 'amount',
  };
  return map[target] || null;
}
