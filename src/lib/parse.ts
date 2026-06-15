export interface ParseResult {
  headers: string[];
  rows: string[][];
  raw?: string;
}

/**
 * Parse an uploaded file.
 * - CSV files are parsed locally (no need for AI).
 * - Excel/PDF files are sent to LlamaParse.
 * Falls back to mock data if API is unavailable.
 */
export async function parseFile(
  buffer: Buffer,
  fileName: string,
): Promise<ParseResult | null> {
  const ext = fileName.split('.').pop()?.toLowerCase();

  // CSV: parse directly
  if (ext === 'csv') {
    return parseCsv(buffer);
  }

  // Excel/PDF: use LlamaParse
  const apiKey = process.env.LLAMA_PARSE_API_KEY;
  if (!apiKey) {
    console.warn('[parse] LLAMA_PARSE_API_KEY not set, using mock');
    return mockParse(buffer, fileName);
  }

  try {
    // Step 1: Upload file to LlamaParse
    const form = new FormData();
    const blob = new Blob([new Uint8Array(buffer)]);
    form.append('file', blob, fileName);

    const uploadRes = await fetch(
      'https://api.cloud.llamaindex.ai/api/parsing/upload',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
      },
    );

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error('[parse] LlamaParse upload failed:', uploadRes.status, text);
      return mockParse(buffer, fileName);
    }

    const uploadData = await uploadRes.json();
    const jobId = uploadData.id;

    // Step 2: Poll for result
    const result = await pollResult(apiKey, jobId);
    if (!result) return mockParse(buffer, fileName);

    // Step 3: Parse markdown table from result
    return extractTableFromMarkdown(result);
  } catch (err) {
    console.error('[parse] LlamaParse error:', err);
    return mockParse(buffer, fileName);
  }
}

async function pollResult(
  apiKey: string,
  jobId: string,
  maxAttempts = 30,
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );

    if (!res.ok) {
      console.error('[parse] Poll failed:', res.status);
      return null;
    }

    const data = await res.json();
    if (data.status === 'completed') {
      return data.result?.markdown || data.result?.text || '';
    }
    if (data.status === 'failed') {
      console.error('[parse] Job failed:', data.error);
      return null;
    }

    // Wait 1 second before retrying
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

function extractTableFromMarkdown(markdown: string): ParseResult | null {
  // Try to find a markdown table (lines containing | and --- separator)
  const lines = markdown.split('\n');
  const tableLines: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      // Skip separator rows (|---|)
      if (!/^[\s|:-]+$/.test(trimmed.replace(/\|/g, ''))) {
        tableLines.push(trimmed);
      }
    } else if (inTable && trimmed === '') {
      break; // end of table
    }
  }

  if (tableLines.length < 2) return null;

  const headers = parseRow(tableLines[0]);
  const rows = tableLines.slice(1).map(parseRow);

  // Filter out fully empty rows
  const nonEmptyRows = rows.filter((r) => r.some((cell) => cell.trim() !== ''));

  return { headers, rows: nonEmptyRows, raw: markdown };
}

function parseRow(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1) // remove leading and trailing empty from split
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

/**
 * Parse a single CSV line, respecting quoted fields.
 */
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
 * Creates sample data to test the pipeline end-to-end.
 */
function mockParse(_buffer: Buffer, _fileName: string): ParseResult | null {
  // Excel/PDF — produce sample data to test the pipeline
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
