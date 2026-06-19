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

    // Log to backend dashboard — fire-and-forget, never blocks or fails the response
    try {
      const senderId = cardType === 'contribution' ? 'MICHANGO' : 'HARUSI';
      const recipients = contacts.map((c: { name: string; phone: string }) => {
        const failed = result.errors?.find((e) => e.phone === c.phone);
        return {
          name: c.name,
          phone: c.phone,
          message: message.replace(/\{\{name\}\}/g, c.name),
          status: failed ? 'failed' : 'sent',
          reason: failed?.reason ?? null,
        };
      });
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/sms/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '',
        },
        body: JSON.stringify({
          cardType,
          senderId,
          messageTemplate: message,
          recipients,
        }),
      });
    } catch (err) {
      console.error('Failed to log SMS batch:', err);
    }

    return NextResponse.json(result);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
