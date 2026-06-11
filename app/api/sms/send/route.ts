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
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
