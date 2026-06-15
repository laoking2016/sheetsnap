import { NextRequest, NextResponse } from 'next/server';
import { parseFile } from '@/lib/parse';
import { mapColumns } from '@/lib/column-mapper';
import { normalizeUnits } from '@/lib/unit-normalizer';
import { generateCsv } from '@/lib/csv-generator';

const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'text/csv',
  'application/pdf',
];
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    // Read form data safely
    let file: File | null = null;
    try {
      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return NextResponse.json(
          { success: false, error: 'No file provided.' },
          { status: 400 },
        );
      }
      const formData = await request.formData();
      file = formData.get('file') as File | null;
    } catch {
      return NextResponse.json(
        { success: false, error: 'No file provided.' },
        { status: 400 },
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided.' },
        { status: 400 },
      );
    }

    // ── Type check ──
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isAllowedType =
      ALLOWED_TYPES.includes(file.type) ||
      ALLOWED_EXTENSIONS.includes(ext);
    if (!isAllowedType) {
      return NextResponse.json(
        { success: false, error: 'Please upload an Excel, CSV, or PDF quotation file.' },
        { status: 400 },
      );
    }

    // ── Size check ──
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size must not exceed 10 MB.' },
        { status: 400 },
      );
    }

    // ── Read file into buffer ──
    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Parse ──
    const parsed = await parseFile(buffer, file.name);
    if (!parsed || parsed.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unable to identify a table in the file. You can copy and paste the data manually, or contact us for assistance.',
        },
        { status: 422 },
      );
    }

    // ── Column mapping ──
    const mapped = mapColumns(parsed.headers, parsed.rows);

    // ── Unit normalization ──
    const normalized = normalizeUnits(mapped.rows);
    const rows = normalized.rows;
    const warnings = [
      ...mapped.warnings,
      ...normalized.warnings,
    ];

    // ── Generate CSV ──
    const csv = generateCsv(rows);

    // ── Response ──
    return NextResponse.json({
      success: true,
      columns: ['产品名称', '规格', '单价', '最小起订量', '货币', '其他信息'],
      rows,
      warnings,
      csv,
    });
  } catch (err) {
    console.error('[upload]', err);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 },
    );
  }
}
