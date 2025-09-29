export function generateWhatsAppLink(messageContent: string, phoneNumber: string): string {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const baseUrl = isMobile ? 'whatsapp://' : 'https://web.whatsapp.com/';
  const formattedPhone = `91${phoneNumber}`;
  return `${baseUrl}send?phone=${formattedPhone}&text=${encodeURIComponent(messageContent)}`;
}