import LlamaCloud, { toFile } from '@llamaindex/llama-cloud';

export interface ParseResult {
  headers: string[];
  rows: string[][];
  raw?: string;
}

/**
 * Parse an uploaded file.
 * - CSV files are parsed locally (no need for AI).
 * - Excel/PDF files use @llamaindex/llama-cloud SDK with built-in polling.
 * In development, falls back to mock data if the API is unavailable.
 */
export async function parseFile(
  buffer: Buffer,
  fileName: string,
): Promise<ParseResult | null> {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const isDev = process.env.NODE_ENV === 'development';

  // CSV: parse directly
  if (ext === 'csv') {
    return parseCsv(buffer);
  }

  // Excel/PDF: use LlamaParse SDK
  // SDK auto-reads LLAMA_PARSE_API_KEY from env
  if (!process.env.LLAMA_PARSE_API_KEY) {
    if (isDev) {
      console.warn('[parse] LLAMA_PARSE_API_KEY not set, using mock');
      return mockParse();
    }
    throw new Error('LLAMA_PARSE_API_KEY is not configured.');
  }

  try {
    const client = new LlamaCloud();

    const result = await client.parsing.parse(
      {
        tier: 'cost_effective',
        version: 'latest',
        upload_file: await toFile(new Uint8Array(buffer), fileName, { type: 'application/octet-stream' }),
        expand: ['markdown_full'],
        input_options: {
          spreadsheet: {
            detect_sub_tables_in_sheets: true,
            include_hidden_sheets: false,
          },
        },
      },
      { verbose: false, timeout: 120_000 },
    );

    const markdown = result.markdown_full || '';
    if (!markdown) return null;

    return extractTableFromMarkdown(markdown);
  } catch (err) {
    console.error('[parse] LlamaParse error:', err);
    if (isDev) {
      console.warn('[parse] falling back to mock (dev only)');
      return mockParse();
    }
    throw err; // Let the API route surface the error to the user
  }
}

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
 * Parse a CSV file directly (no external API needed).
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

/**
 * Mock parser for development / fallback.
 */
function mockParse(): ParseResult | null {
  return {
    headers: ['Product Name', 'Spec', 'Unit Price', 'MOQ', 'Currency'],
    rows: [
      ['LED Bulb 12W', 'E27 220V 6000K', '2.50', '100', 'USD'],
      ['LED Bulb 9W', 'E27 220V 4000K', '1.80', '200', 'USD'],
      ['LED Strip 5m', 'RGB 5050 12V', '8.90', '50', 'USD'],
      ['LED Driver 12V', '12V 5A 60W', '6.20', '100', 'USD'],
      ['Downlight 6inch', '12W CCT 3000K-6000K', '4.50', '50', 'USD'],
    ],
  };
}
