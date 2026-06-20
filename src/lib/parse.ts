import LlamaCloud, { toFile } from '@llamaindex/llama-cloud';

export interface ParseResult {
  headers: string[];
  rows: string[][];
  raw?: string;
}

/**
 * Parse an uploaded file using LlamaParse.
 *
 * Pipeline:
 *   1. LlamaParse (with English parsing instruction) → markdown + structured items
 *   2. Extract table data from structured items or markdown
 *   3. Return raw rows for column mapping → CSV
 *
 * CSV files are parsed locally.
 */
export async function parseFile(
  buffer: Buffer,
  fileName: string,
): Promise<ParseResult | null> {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const isDev = process.env.NODE_ENV === 'development';

  // CSV: parse directly (no AI needed)
  if (ext === 'csv') {
    return parseCsv(buffer);
  }

  // Excel/PDF: use LlamaParse with English parsing instruction
  if (!process.env.LLAMA_PARSE_API_KEY) {
    if (isDev) {
      console.warn('[parse] LLAMA_PARSE_API_KEY not set, using mock');
      return mockParse();
    }
    throw new Error('LLAMA_PARSE_API_KEY is not configured.');
  }

  try {
    const client = new LlamaCloud();

    // ── Step 1: Parse with custom English instruction ──
    const result = await client.parsing.parse(
      {
        tier: 'agentic',
        version: 'latest',
        upload_file: await toFile(new Uint8Array(buffer), fileName, {
          type: 'application/octet-stream',
        }),
        expand: ['markdown_full', 'items'],
        agentic_options: {
          custom_prompt: [
            // Instruction: what to extract
            'Extract the product quotation table from this document.',
            '',
            'Rules:',
            '- Output the table in markdown format with pipe-separated columns.',
            '- The table MUST include these columns in this exact order:',
            '  1. Product Name (e.g. "LED Bulb 12W")',
            '  2. Specification (e.g. "E27 220V 6000K")',
            '  3. Unit Price (numeric value only, e.g. "2.50")',
            '  4. MOQ — Minimum Order Quantity (e.g. "100")',
            '  5. Currency (e.g. "USD", "CNY", "EUR")',
            '- If a column is missing from the source, leave it blank.',
            '- Skip header rows, title lines, logos, and company info.',
            '- Only output rows that contain actual product data.',
            '- Keep numbers as-is (do not add or remove decimal places).',
            '- Detect and preserve the currency from context.',
          ].join('\n'),
        },
      },
      { verbose: false, timeout: 120_000 },
    );

    // ── Step 2: Extract table from structured items (preferred) or markdown ──
    const tableRows = extractTableFromItems(result.items);
    if (tableRows) {
      return tableRows;
    }

    // Fallback: extract from markdown
    const markdown = result.markdown_full || '';
    if (!markdown) return null;

    return extractTableFromMarkdown(markdown);
  } catch (err) {
    console.error('[parse] LlamaParse error:', err);
    if (isDev) {
      console.warn('[parse] falling back to mock (dev only)');
      return mockParse();
    }
    throw err;
  }
}

/**
 * Extract table data from structured items (expand: ['items']).
 */
function extractTableFromItems(
  items: unknown,
): ParseResult | null {
  if (!items || typeof items !== 'object') return null;
  const obj = items as Record<string, unknown>;
  const pages = obj?.pages;
  if (!Array.isArray(pages) || pages.length === 0) return null;

  const allRows: string[][] = [];
  let headers: string[] = [];
  let foundHeaders = false;

  for (const page of pages) {
    const pageObj = page as Record<string, unknown>;
    if (pageObj?.success === false) continue;
    const pageItems = pageObj?.items;
    if (!Array.isArray(pageItems)) continue;

    for (const item of pageItems) {
      const table = item as Record<string, unknown>;
      if (table?.type !== 'table') continue;
      const rows = table?.rows;
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const tableRows = rows as Array<Array<string | number | null>>;

      if (!foundHeaders && tableRows.length > 0) {
        const firstRow = tableRows[0] || [];
        headers = firstRow.map((c) => String(c ?? ''));
        const hasNumbers = headers.some((h) => !isNaN(Number(h)));
        if (!hasNumbers) {
          foundHeaders = true;
          tableRows.shift();
        } else {
          headers = headers.map((_, i) => `Column ${i + 1}`);
        }
      }

      for (const row of tableRows) {
        const strRow = (row || []).map((c) => String(c ?? ''));
        if (strRow.some((c) => c.trim())) {
          allRows.push(strRow);
        }
      }
    }
  }

  if (allRows.length === 0) return null;
  if (headers.length === 0 && allRows.length > 0) {
    headers = allRows[0].map((_, i) => `Column ${i + 1}`);
  }

  return { headers, rows: allRows };
}

/**
 * Extract table from markdown output (pipe tables).
 */
function extractTableFromMarkdown(markdown: string): ParseResult | null {
  const lines = markdown.split('\n');
  const tableLines: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      if (!/^[\s|:-]+$/.test(trimmed.replace(/\|/g, ''))) {
        tableLines.push(trimmed);
      }
    } else if (inTable && trimmed === '') {
      break;
    }
  }

  if (tableLines.length < 2) return null;

  const headers = parseRow(tableLines[0]);
  const rows = tableLines.slice(1).map(parseRow);
  const nonEmptyRows = rows.filter((r) => r.some((cell) => cell.trim() !== ''));

  return { headers, rows: nonEmptyRows, raw: markdown };
}

function parseRow(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

/**
 * Parse a CSV file locally.
 */
function parseCsv(buffer: Buffer): ParseResult | null {
  const text = buffer.toString('utf-8');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) =>
    parseCsvLine(line).map((cell) => cell.trim()),
  );
  const nonEmptyRows = rows.filter((r) => r.some((cell) => cell !== ''));
  if (nonEmptyRows.length === 0) return null;

  return { headers, rows: nonEmptyRows };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function mockParse(): ParseResult | null {
  return {
    headers: ['Product Name', 'Specification', 'Unit Price', 'MOQ', 'Currency'],
    rows: [
      ['LED Bulb 12W', 'E27 220V 6000K', '2.50', '100', 'USD'],
      ['LED Bulb 9W', 'E27 220V 4000K', '1.80', '200', 'USD'],
      ['LED Strip 5m', 'RGB 5050 12V', '8.90', '50', 'USD'],
    ],
  };
}
