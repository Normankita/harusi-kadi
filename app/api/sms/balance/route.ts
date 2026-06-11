import { NextResponse } from 'next/server';
import { checkBalance } from '@/lib/sms';

export async function GET() {
  try {
    const result = await checkBalance();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
