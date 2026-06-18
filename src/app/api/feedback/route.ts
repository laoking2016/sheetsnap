import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, email, rating, pageUrl } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required.' },
        { status: 400 },
      );
    }

    // Log to stdout for now (MVP — can write to feedback table later)
    console.log('[feedback]', JSON.stringify({ message, email, rating, pageUrl }));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
