export const defaultGeneralTemplates = [
  {
    id: 'default-1',
    profileType: 'General' as const,
    messageTemplate: 'Hello {patient_name},\n\nHow are you feeling after your recent visit to {clinic_name}? We hope you are doing well. If you have any questions or concerns, please don\'t hesitate to contact us at {clinic_phone}.',
    sequenceDays: 15,
    sequenceOrder: 1
  },
  {
    id: 'default-2',
    profileType: 'General' as const,
    messageTemplate: 'Hello {patient_name},\n\nThis is a follow-up message from {clinic_name}. We want to ensure you\'re doing well and address any concerns you might have. Feel free to reach us at {clinic_phone}.',
    sequenceDays: 30,
    sequenceOrder: 2
  }
];