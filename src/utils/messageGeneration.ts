import { generateAIReview } from '../services/aiService';
import { supabase } from '../services/supabaseClient';
import type { Review, User, ReviewRequestTemplate } from '../types';

export interface MessageGenerationResult {
  messageContent: string;
  aiReviewText?: string;
}

export interface MessageGenerationParams {
  review: Review;
  messageType: 'ai_first' | 'ai_second' | 'simple_thank_you' | 'gmb_link';
  user: User;
  reviewRequestTemplates: ReviewRequestTemplate[];
}

export async function generateReviewMessageContent({
  review,
  messageType,
  user,
  reviewRequestTemplates
}: MessageGenerationParams): Promise<MessageGenerationResult> {
  let messageContent = '';
  let aiReviewText: string | undefined;

  switch (messageType) {
    case 'ai_first': {
      // Find the AI integrated template (first message)
      const template = reviewRequestTemplates.find(t => t.templateType === 'ai_integrated');
      if (!template) {
        throw new Error('AI review template not found. Please contact support.');
      }

      // Note: Do NOT include AI review text or GMB link in the first message anymore.
      // We still proactively generate and persist the AI review text if missing, so the next step is fast.
      aiReviewText = review.aiReviewText;
      if (!aiReviewText) {
        aiReviewText = await generateAIReview({
          clinicName: user.clinicName || '',
          doctorName: user.name || '',
          treatment: review.treatment || 'consultation',
          date: new Date(review.appointmentDate).toLocaleDateString(),
        });
        try {
          await supabase
            .from('reviews')
            .update({ ai_review_text: aiReviewText })
            .eq('id', review.id);
        } catch (e) {
          console.warn('Failed to persist ai_review_text (ai_first path):', e);
        }
      }

      // Replace placeholders in the template (no {ai_review_text} and no {gmb_link})
      messageContent = template.messageTemplate
        .replace(/{patient_name}/g, review.patientName)
        .replace(/{clinic_name}/g, user.clinicName || '')
        .replace(/{clinic_address}/g, user.clinicAddress || '')
        .replace(/{contact_phone}/g, user.contactPhone || '')
        .replace(/{visit_date}/g, new Date(review.appointmentDate).toLocaleDateString());
      
      break;
    }
    
    case 'ai_second': {
      // Generate AI review text if not already available
      aiReviewText = review.aiReviewText;
      if (!aiReviewText) {
        aiReviewText = await generateAIReview({
          clinicName: user.clinicName || '',
          doctorName: user.name || '',
          treatment: review.treatment || 'consultation',
          date: new Date(review.appointmentDate).toLocaleDateString(),
        });
        try {
          await supabase
            .from('reviews')
            .update({ ai_review_text: aiReviewText })
            .eq('id', review.id);
        } catch (e) {
          console.warn('Failed to persist ai_review_text (ai_second path):', e);
        }
      }

      // Only send the AI-generated review text itself
      messageContent = (aiReviewText || '').trim();
      break;
    }
    
    case 'simple_thank_you': {
      // Find the simple thank you template
      const template = reviewRequestTemplates.find(t => t.templateType === 'simple_thank_you');
      if (!template) {
        throw new Error('Simple thank you template not found. Please contact support.');
      }

      // Replace placeholders in the template
      messageContent = template.messageTemplate
        .replace(/{patient_name}/g, review.patientName)
        .replace(/{clinic_name}/g, user.clinicName || '')
        .replace(/{clinic_address}/g, user.clinicAddress || '')
        .replace(/{gmb_link}/g, user.gmbLink || '')
        .replace(/{contact_phone}/g, user.contactPhone || '')
        .replace(/{visit_date}/g, new Date(review.appointmentDate).toLocaleDateString());
      
      break;
    }
    
    case 'gmb_link': {
      if (!user.gmbLink) {
        throw new Error('Google My Business link not configured. Please update in Settings.');
      }
      
      messageContent = `Hello ${review.patientName},

Thank you for visiting ${user.clinicName || 'our clinic'}. We would greatly appreciate your feedback.

You can submit your review here: ${user.gmbLink}

Best regards,
Team ${user.clinicName || 'our clinic'}`;
      break;
    }
    
    default:
      throw new Error('Invalid message type');
  }

  return {
    messageContent,
    aiReviewText
  };
}