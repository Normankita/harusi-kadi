export const formatTanzaniaPhone = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '255' + cleaned.substring(1);
  } else if (cleaned.length === 9 && !cleaned.startsWith('255')) {
    cleaned = '255' + cleaned;
  }
  return cleaned;
};

export const isValidTanzaniaPhone = (phone: string): boolean => {
  const formatted = formatTanzaniaPhone(phone);
  return (
    formatted.startsWith('255') &&
    formatted.length === 12
  );
};
