export const defaultReviewRequestTemplates = [
  {
    id: 'default-ai-integrated',
    name: 'AI-Powered Review Request',
    templateType: 'ai_integrated' as const,
    messageTemplate: `Hello {patient_name},

We hope you had a satisfying experience with the services at {clinic_name}. Your feedback is highly valuable to us, and we would greatly appreciate it if you could share your review.

Your visit details:
📅 Date: {visit_date}
🏥 Name of Center: {clinic_name}
📍 Location: {clinic_address}

You will receive a sample review in the next message and which you can change or modify.



Best regards,
Team {clinic_name}
📞 {contact_phone}`,
    description: 'AI-generated review suggestion with GMB link in one message',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'default-simple-thank-you',
    name: 'Simple Thank You & Review Link',
    templateType: 'simple_thank_you' as const,
    messageTemplate: `Hello {patient_name},

Thank you for choosing {clinic_name} for your healthcare needs. We hope you had a positive experience with our services.

Your visit details:
📅 Date: {visit_date}
🏥 Name of Center: {clinic_name}
📍 Location: {clinic_address}

We would greatly appreciate if you could take a moment to share your feedback and leave us a review: {gmb_link}

Your feedback helps us improve our services and assists other patients in making informed decisions.

Best regards,
Team {clinic_name}
📞 {contact_phone}`,
    description: 'Simple thank you message with review link',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];