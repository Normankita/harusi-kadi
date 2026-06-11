import { formatTanzaniaPhone, isValidTanzaniaPhone } from './phone';

const BASE_URL = process.env.NEXTSMS_BASE_URL || 'https://messaging-service.co.tz';
const IS_PRODUCTION = process.env.NEXTSMS_MODE === 'production';

function getSenderId(cardType?: string): string {
  switch (cardType) {
    case 'contribution':
      return process.env.NEXTSMS_SENDER_ID_CONTRIBUTION || 'MICHANGO';
    case 'meeting':
      return process.env.NEXTSMS_SENDER_ID_MEETING || 'KIKAO';
    case 'invitation':
    default:
      return process.env.NEXTSMS_SENDER_ID_INVITATION || 'HARUSI';
  }
}
console.log(`[SMS Service] Mode: ${IS_PRODUCTION ? 'PRODUCTION 🚀' : 'DEVELOPMENT 🧪'}`);


function getAuthHeader(): string {
  const token = process.env.NEXTSMS_API_TOKEN;
  if (!token) throw new Error('NEXTSMS_API_TOKEN is not set');
  return `Bearer ${token}`;
}

function getHeaders() {
  return {
    Authorization: getAuthHeader(),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export interface SMSSingleResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SMSBulkResult {
  success: boolean;
  sent: number;
  failed: number;
  skipped: number;
  errors: { name: string; phone: string; reason: string }[];
}

export interface SMSBalanceResult {
  success: boolean;
  balance?: number;
  currency?: string;
  display?: string;
  error?: string;
}

export async function sendSingleSMS({
  to,
  message,
  cardType,
}: {
  to: string;
  message: string;
  cardType?: string;
}): Promise<SMSSingleResult> {
  const formattedPhone = formatTanzaniaPhone(to);
  const endpoint = IS_PRODUCTION
    ? `${BASE_URL}/api/sms/v2/text/single`
    : `${BASE_URL}/api/sms/v2/test/text/single`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        from: getSenderId(cardType),
        to: formattedPhone,
        text: message,
        flash: 0,
      }),
    });

    const body = await res.json().catch(() => ({}));
    const result: SMSSingleResult = res.ok
      ? { success: true, messageId: body?.messages?.[0]?.id ?? body?.id }
      : { success: false, error: body?.message ?? `HTTP ${res.status}` };

    console.log(`[SMS Single] From: ${getSenderId(cardType)} | To: ${formattedPhone} | Status: ${result.success ? 'success' : `fail — ${result.error}`}`);
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Network error';
    console.log(`[SMS Single] From: ${getSenderId(cardType)} | To: ${formattedPhone} | Status: fail — ${error}`);
    return { success: false, error };
  }
}

export async function sendBulkSMS({
  contacts,
  message,
  cardType,
}: {
  contacts: { name: string; phone: string }[];
  message: string;
  cardType?: string;
}): Promise<SMSBulkResult> {
  const skippedContacts: SMSBulkResult['errors'] = [];
  const messages: { from: string; to: string; text: string }[] = [];

  for (const contact of contacts) {
    if (!isValidTanzaniaPhone(contact.phone)) {
      skippedContacts.push({ name: contact.name, phone: contact.phone, reason: 'Namba si sahihi' });
      continue;
    }
    messages.push({
      from: getSenderId(cardType),
      to: formatTanzaniaPhone(contact.phone),
      text: message.replace('{{name}}', contact.name),
    });
  }

  if (messages.length === 0) {
    console.log(`[SMS Bulk] Sent: 0 | Failed: 0 | Skipped: ${skippedContacts.length}`);
    return { success: false, sent: 0, failed: 0, skipped: skippedContacts.length, errors: skippedContacts };
  }

  const endpoint = IS_PRODUCTION
    ? `${BASE_URL}/api/sms/v2/text/multi`
    : `${BASE_URL}/api/sms/v2/test/text/multi`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ messages, flash: 0 }),
    });

    const body = await res.json().catch(() => ({}));
    const result: SMSBulkResult = {
      success: res.ok,
      sent: res.ok ? messages.length : 0,
      failed: res.ok ? 0 : messages.length,
      skipped: skippedContacts.length,
      errors: res.ok
        ? skippedContacts
        : [
          ...skippedContacts,
          ...messages.map(m => ({ name: '', phone: m.to, reason: body?.message ?? `HTTP ${res.status}` })),
        ],
    };

    console.log(`[SMS Bulk] From: ${getSenderId(cardType)} | Sent: ${result.sent} | Failed: ${result.failed} | Skipped: ${result.skipped}`);
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Network error';
    console.log(`[SMS Bulk] Sent: 0 | Failed: ${messages.length} | Skipped: ${skippedContacts.length} — ${error}`);
    return {
      success: false,
      sent: 0,
      failed: messages.length,
      skipped: skippedContacts.length,
      errors: [...skippedContacts, ...messages.map(m => ({ name: '', phone: m.to, reason: error }))],
    };
  }
}

export async function checkBalance(): Promise<SMSBalanceResult> {
  try {
    const res = await fetch(`${BASE_URL}/api/v2/balance`, {
      headers: { Authorization: getAuthHeader(), Accept: 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    const result: SMSBalanceResult = res.ok
      ? { success: true, balance: data?.sms_balance, currency: 'TZS', display: data?.display }
      : { success: false, error: data?.message ?? `HTTP ${res.status}` };
    console.log('[SMS] Balance:', result);
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Network error';
    console.log('[SMS] Balance check failed:', error);
    return { success: false, error };
  }
}
