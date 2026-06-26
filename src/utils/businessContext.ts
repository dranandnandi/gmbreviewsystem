import type { BusinessContext } from '../types';

export const DEFAULT_BUSINESS_CONTEXT: Required<BusinessContext> = {
  businessType: '',
  customerLabel: 'patient',
  appointmentLabel: 'appointment',
  locationLabel: 'center',
  serviceKeywords: '',
  promptNotes: '',
};

export function normalizeBusinessContext(context?: BusinessContext | null): Required<BusinessContext> {
  return {
    ...DEFAULT_BUSINESS_CONTEXT,
    ...(context || {}),
  };
}

export function getBusinessContextPrompt(context?: BusinessContext | null): string {
  const normalized = normalizeBusinessContext(context);
  const lines = [
    normalized.businessType ? `Business type: ${normalized.businessType}` : '',
    normalized.customerLabel !== DEFAULT_BUSINESS_CONTEXT.customerLabel
      ? `Customer label: ${normalized.customerLabel}`
      : '',
    normalized.appointmentLabel !== DEFAULT_BUSINESS_CONTEXT.appointmentLabel
      ? `Booking/interaction label: ${normalized.appointmentLabel}`
      : '',
    normalized.locationLabel !== DEFAULT_BUSINESS_CONTEXT.locationLabel
      ? `Service location/mode: ${normalized.locationLabel}`
      : '',
    normalized.serviceKeywords ? `Service keywords: ${normalized.serviceKeywords}` : '',
    normalized.promptNotes ? `Writing guidance: ${normalized.promptNotes}` : '',
  ].filter(Boolean);

  return lines.length > 0 ? lines.join('\n') : '';
}

export function compactBusinessContext(context?: BusinessContext | null): BusinessContext | null {
  const normalized = normalizeBusinessContext(context);
  const compacted: BusinessContext = {};

  if (normalized.businessType.trim()) compacted.businessType = normalized.businessType.trim();
  if (
    normalized.customerLabel.trim() &&
    normalized.customerLabel.trim() !== DEFAULT_BUSINESS_CONTEXT.customerLabel
  ) {
    compacted.customerLabel = normalized.customerLabel.trim();
  }
  if (
    normalized.appointmentLabel.trim() &&
    normalized.appointmentLabel.trim() !== DEFAULT_BUSINESS_CONTEXT.appointmentLabel
  ) {
    compacted.appointmentLabel = normalized.appointmentLabel.trim();
  }
  if (
    normalized.locationLabel.trim() &&
    normalized.locationLabel.trim() !== DEFAULT_BUSINESS_CONTEXT.locationLabel
  ) {
    compacted.locationLabel = normalized.locationLabel.trim();
  }
  if (normalized.serviceKeywords.trim()) compacted.serviceKeywords = normalized.serviceKeywords.trim();
  if (normalized.promptNotes.trim()) compacted.promptNotes = normalized.promptNotes.trim();

  return Object.keys(compacted).length > 0 ? compacted : null;
}
