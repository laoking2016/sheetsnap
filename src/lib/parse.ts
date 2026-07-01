import LlamaCloud, { toFile } from '@llamaindex/llama-cloud';

export interface ParseResult {
  headers: string[];
  rows: string[][];
  raw?: string;
}

/**
 * Quote data schema for structured extraction.
 * Extracts each product row as a structured object.
 */
const QUOTE_SCHEMA = {
  type: 'object',
  properties: {
    product_details: {
      description: 'A list of products or services included in the quotation.',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item_no: {
            description: 'The sequential number of the item in the list.',
            type: 'integer',
          },
          description: {
            description:
              'A detailed description of the product, including specifications.',
            type: 'string',
          },
          model: {
            description:
              'The model number or specific identifier of the product, if available.',
            anyOf: [
              { description: 'The model number of the product.', type: 'string' },
              { type: 'null' },
            ],
          },
          quantity: {
            description:
              'The number of units quoted for this item (MOQ if specified).',
            type: 'integer',
          },
          unit: {
            description:
              'The unit of measurement for the quantity, e.g., pcs, sets, boxes.',
            type: 'string',
          },
          unit_price: {
            description:
              'The price per unit of the item. Numeric value only, without currency symbol.',
            type: 'number',
          },
          amount: {
            description:
              'The total amount for this item (Quantity x Unit Price).',
            type: 'number',
          },
          currency: {
            description:
              'The currency of the prices, e.g., USD, CNY, EUR. Detect from context.',
            type: 'string',
          },
        },
        required: [
          'item_no',
          'description',
          'quantity',
          'unit',
          'unit_price',
          'amount',
          'currency',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['product_details'],
  additionalProperties: false,
};

/**
 * Parse an uploaded file using LlamaCloud Extract API.
 *
 * Pipeline:
 *   1. Upload file → client.files.create()
 *   2. Submit extract job with JSON Schema → client.extract.create()
 *   3. Poll until COMPLETED → client.extract.get()
 *   4. Map extracted rows to standard columns
 *
 * CSV files are parsed locally.
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

  // Excel/PDF: use LlamaCloud Extract API
  if (!process.env.LLAMA_PARSE_API_KEY) {
    if (isDev) {
      console.warn('[parse] LLAMA_PARSE_API_KEY not set, using mock');
      return mockParse();
    }
    throw new Error('LLAMA_PARSE_API_KEY is not configured.');
  }

  try {
    const client = new LlamaCloud();

    // Step 1: Upload file
    const fileObj = await client.files.create({
      file: await toFile(new Uint8Array(buffer), fileName, {
        type: 'application/octet-stream',
      }),
      purpose: 'extract',
    });

    // Step 2: Submit extract job with JSON Schema
    let job = await client.extract.create({
      file_input: fileObj.id,
      configuration: {
        data_schema: QUOTE_SCHEMA,
        tier: 'fast',
        extraction_target: 'per_table_row',
        parse_tier: 'fast',
      },
    });

    // Step 3: Poll until terminal state
    const terminalStates = ['COMPLETED', 'FAILED', 'CANCELLED'];
    while (!terminalStates.includes(job.status)) {
      await new Promise((r) => setTimeout(r, 800));
      job = await client.extract.get(job.id, {
        expand: ['extract_metadata'],
      });
    }

    if (job.status !== 'COMPLETED') {
      throw new Error(
        `Extract job ${job.id} failed: ${job.error_message || 'unknown error'}`,
      );
    }

    // Step 4: Map extracted data to standard rows
    console.log('[parse] extract_result:', JSON.stringify(job.extract_result).slice(0, 500));
    return mapExtractResult(job.extract_result);
  } catch (err) {
    console.error('[parse] Extract error:', err);
    if (isDev) {
      console.warn('[parse] falling back to mock (dev only)');
      return mockParse();
    }
    throw err;
  }
}

/**
 * Map the structured extract result to our standard column format.
 *
 * The Extract API returns data matching QUOTE_SCHEMA exactly.
 * Schema fields:
 *   description  → Product Name (detailed description incl. specs)
 *   model        → Specification (model number)
 *   unit_price   → Unit Price
 *   quantity     → MOQ (Minimum Order Quantity)
 *   currency     → Currency
 *   unit, amount → Other Info
 */
function mapExtractResult(
  extractResult: unknown,
): ParseResult | null {
  if (!extractResult || typeof extractResult !== 'object') return null;

  // The Extract API returns [{ product_details: [...] }]
  const obj = extractResult as Record<string, unknown>;
  const firstEntry = obj['0'] as Record<string, unknown> | undefined;
  const details = firstEntry?.product_details as unknown[] | undefined;

  console.log('[mapExtractResult] keys:', Object.keys(obj));
  console.log('[mapExtractResult] product_details isArray:', Array.isArray(details));
  console.log('[mapExtractResult] product_details length:', Array.isArray(details) ? details.length : 'N/A');

  if (!Array.isArray(details) || details.length === 0) return null;

  const headers = [
    'description',
    'model',
    'unit_price',
    'quantity',
    'currency',
    'amount',
  ];

  const rows = details.map((item: unknown) => {
    const row = item as Record<string, unknown>;

    return [
      String(row.description ?? ''),
      row.model ? String(row.model) : '',
      String(row.unit_price ?? ''),
      String(row.quantity ?? ''),
      String(row.currency ?? 'USD'),
      String(row.amount ?? ''),
    ];
  });

  return { headers, rows };
}

/**
 * Parse a CSV file locally.
 */
function parseCsv(buffer: Buffer): ParseResult | null {
  const text = buffer.toString('utf-8');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const headers = lines[0]
    .split(',')
    .map((h) => h.trim().replace(/^"|"$/g, ''));
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
    headers: ['description', 'model', 'unit_price', 'quantity', 'currency', 'amount'],
    rows: [
      ['LED Bulb 12W', 'E27 220V 6000K', '2.50', '100', 'USD', '250.00'],
      ['LED Bulb 9W', 'E27 220V 4000K', '1.80', '200', 'USD', '360.00'],
    ],
  };
}
