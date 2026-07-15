export function generateWhatsAppLink(messageContent: string, phoneNumber: string): string {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const baseUrl = isMobile ? 'whatsapp://' : 'https://web.whatsapp.com/';
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  const withoutLeadingZero = digitsOnly.replace(/^0+/, '');
  const formattedPhone = withoutLeadingZero.startsWith('91') && withoutLeadingZero.length > 10
    ? withoutLeadingZero
    : `91${withoutLeadingZero}`;
  return `${baseUrl}send?phone=${formattedPhone}&text=${encodeURIComponent(messageContent)}`;
}
