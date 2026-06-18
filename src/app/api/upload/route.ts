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
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { success: false, error: `File size must not exceed 10 MB. Your file is ${sizeMB} MB.` },
        { status: 400 },
      );
    }

    // ── Empty file check ──
    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'The file is empty. Please check the file content.' },
        { status: 422 },
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
      columns: ['Product Name', 'Specification', 'Unit Price', 'MOQ', 'Currency', 'Other Info'],
      rows,
      warnings,
      csv,
    });
  } catch (err) {
    console.error('[upload]', err);

    const errorMessage =
      err instanceof Error && err.message.includes('LlamaParse')
        ? `${err.message} Please try again or upload a CSV file instead.`
        : 'Failed to parse the file. Please try again or upload a CSV file.';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
