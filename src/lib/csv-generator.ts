/**
 * Generate a CSV string from mapped rows.
 * Uses UTF-8 BOM for Excel compatibility.
 */
export function generateCsv(rows: Record<string, string>[]): string {
  const columns = ['Product Name', 'Specification', 'Unit Price', 'MOQ', 'Currency', 'Other Info'];

  // BOM + header row
  let csv = '\ufeff'; // UTF-8 BOM
  csv += columns.map(escapeCsvField).join(',') + '\n';

  // Data rows
  for (const row of rows) {
    const values = columns.map((col) => escapeCsvField(row[col] || ''));
    csv += values.join(',') + '\n';
  }

  return csv;
}

/**
 * Escape a field for CSV.
 * - If the field contains commas, double quotes, or newlines, wrap in double quotes.
 * - Double quotes inside are escaped as "".
 */
function escapeCsvField(value: string): string {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // Check if we need quoting
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}
