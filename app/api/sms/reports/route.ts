import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryReports } from '@/lib/sms';

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;

  const result = await getDeliveryReports({
    sender: p.get('sender') || undefined,
    messageId: p.get('messageId') || undefined,
    sentSince: p.get('sentSince') || undefined,
    sentUntil: p.get('sentUntil') || undefined,
    size: p.get('size') ? Number(p.get('size')) : undefined,
  });

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
