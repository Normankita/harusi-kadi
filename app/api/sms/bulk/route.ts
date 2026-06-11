import { NextRequest, NextResponse } from 'next/server';
import { sendBulkSMS } from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contacts, message, cardType } = body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Orodha ya mawasiliano inahitajika' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Ujumbe unahitajika' },
        { status: 400 }
      );
    }

    const result = await sendBulkSMS({ contacts, message, cardType });
    return NextResponse.json(result);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
