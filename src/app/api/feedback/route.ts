import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { message, email, rating, pageUrl } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required.' },
        { status: 400 },
      );
    }

    // Get current user if logged in
    const session = await auth();
    const userId = session?.user?.id || null;

    // Write to Supabase feedback table
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { error } = await supabase.from('feedback').insert({
      user_id: userId,
      email: email || null,
      message,
      rating: rating || null,
      page_url: pageUrl || null,
    });

    if (error) {
      console.error('[feedback] Supabase insert error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save feedback.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[feedback] Error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
