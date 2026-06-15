export interface NormalizeResult {
  rows: Record<string, string>[];
  warnings: { row: number; column: string; message: string }[];
}

/**
 * Unit mapping table.
 * Key: normalized form. Value: array of raw patterns to match.
 */
const UNIT_MAP: Record<string, RegExp[]> = {
  '个': [/^pcs$/, /^piece/, /^pieces$/, /^ea$/, /^each$/],
  '公斤': [/^kg$/, /^kilo/, /^kilogram/],
  '克': [/^g$/, /^gram/],
  '米': [/^m$/i, /^meter/, /^metre/],
  '厘米': [/^cm$/],
  '毫米': [/^mm$/],
  '升': [/^l$/i, /^liter/, /^litre/],
  '箱': [/^box$/, /^boxes$/, /^carton/, /^ctn$/],
  '套': [/^set$/, /^sets$/],
  '对': [/^pair$/, /^pairs$/],
  '卷': [/^roll$/, /^rolls$/],
  '打': [/^doz$/, /^dozen/, /^dozens$/],
};

/**
 * Identify and normalize the "spec" column (which often contains unit info).
 * Also checks "其他信息" column.
 */
export function normalizeUnits(
  mappedRows: Record<string, string>[],
): NormalizeResult {
  const warnings: NormalizeResult['warnings'] = [];
  const rows = mappedRows.map((row) => {
    const newRow = { ...row };

    // Try to normalize in "规格" column
    const spec = newRow['规格'];
    const normalizedSpec = normalizeUnitInString(spec);
    if (normalizedSpec !== spec) {
      newRow['规格'] = normalizedSpec;
    }

    // Try to normalize in "其他信息" column (in case unit is stored there)
    const other = newRow['其他信息'];
    if (other) {
      const normalizedOther = normalizeUnitInString(other);
      if (normalizedOther !== other) {
        newRow['其他信息'] = normalizedOther;
      }
    }

    return newRow;
  });

  return { rows, warnings };
}

/**
 * Normalize units found within a string value.
 * e.g., "5000 pcs" → "5000 个", "2.5 kg" → "2.5 公斤"
 */
function normalizeUnitInString(value: string): string {
  if (!value) return value;

  let result = value;

  for (const [standard, patterns] of Object.entries(UNIT_MAP)) {
    for (const pattern of patterns) {
      // Match the pattern as a whole word (preceded/followed by word boundary or non-word chars)
      const regex = new RegExp(
        `(^|[\\s,;(\/])(${pattern.source})([\\s,;)\\/]|$)`,
        'i',
      );
      if (regex.test(result)) {
        result = result.replace(regex, `$1${standard}$3`);
      }
    }
  }

  return result;
}

/**
 * Try to detect a unit from a standalone unit value.
 * Used when the entire cell is just a unit string.
 * Returns normalized unit, or null if unrecognized.
 */
export function detectUnit(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  for (const [standard, patterns] of Object.entries(UNIT_MAP)) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return standard;
      }
    }
  }
  return null;
}
