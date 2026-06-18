import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { event, metadata } = await request.json();

    if (!event || typeof event !== 'string') {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Log to stdout (Vercel captures this automatically)
    console.log('[analytics]', event, metadata ? JSON.stringify(metadata) : '');

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
