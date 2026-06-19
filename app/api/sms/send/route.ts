import { NextRequest, NextResponse } from 'next/server';
import { sendSingleSMS } from '@/lib/sms';
import { isValidTanzaniaPhone } from '@/lib/phone';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, cardType } = body;

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Namba ya simu na ujumbe vinahitajika' },
        { status: 400 }
      );
    }

    if (!isValidTanzaniaPhone(to)) {
      return NextResponse.json(
        { success: false, error: 'Namba ya simu si sahihi' },
        { status: 400 }
      );
    }

    const result = await sendSingleSMS({ to, message, cardType });

    // Log to backend dashboard — fire-and-forget, never blocks or fails the response
    try {
      const senderId = cardType === 'contribution' ? 'MICHANGO' : 'HARUSI';
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
          recipients: [
            {
              name: 'Mtu Mmoja',
              phone: to,
              message,
              status: result.success ? 'sent' : 'failed',
              reason: result.success ? null : result.error,
            },
          ],
        }),
      });
    } catch (err) {
      console.error('Failed to log SMS batch:', err);
    }

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
