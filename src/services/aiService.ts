import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabaseClient';
import type { BusinessContext } from '../types';

// (Legacy) Clinic qualities + random selection removed from client since review generation moved server-side.

interface ReviewParams {
  clinicName: string;
  doctorName: string; // kept for backward compatibility (not sent to edge)
  treatment: string;
  date: string; // human readable or ISO
  tone?: 'warm' | 'professional' | 'friendly';
  maxWords?: number;
  language?: string; // default en
  seedPatientHint?: string; // optional nuance / context
  clinicKeywords?: string;
  businessContext?: BusinessContext | null;
}

// NOTE: Direct Gemini usage is retained ONLY for sequence template generation below.
// Review generation now happens server-side via a Supabase Edge Function to avoid exposing API keys.
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function generateAIReview(params: ReviewParams): Promise<string> {
  // Preferred: Supabase functions.invoke (handles auth headers & easier CORS)
  try {
    const { data, error } = await supabase.functions.invoke('generate-review', {
      body: {
        clinicName: params.clinicName,
        treatment: params.treatment,
        date: params.date,
        tone: params.tone,
        maxWords: params.maxWords,
        language: params.language,
        seedPatientHint: params.seedPatientHint,
        clinicKeywords: params.clinicKeywords,
        businessContext: params.businessContext
      }
    });
    if (error) throw error;
    if ((data as any)?.reviewText) return (data as any).reviewText;
    console.warn('[AI REVIEW] invoke returned without reviewText, data:', data);
    // fallback below
  } catch (invokeErr) {
    console.warn('[AI REVIEW] invoke failed, attempting manual fetch fallback', invokeErr);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const functionUrl = supabaseUrl
        ? `${supabaseUrl}/functions/v1/generate-review`
        : '/functions/v1/generate-review';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (anonKey) {
        headers['apikey'] = anonKey;
        headers['Authorization'] = `Bearer ${anonKey}`;
      }

      const resp = await fetch(functionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clinicName: params.clinicName,
          treatment: params.treatment,
          date: params.date,
          tone: params.tone,
          maxWords: params.maxWords,
          language: params.language,
          seedPatientHint: params.seedPatientHint,
          clinicKeywords: params.clinicKeywords,
          businessContext: params.businessContext
        })
      });
      if (!resp.ok) {
        let detail = '';
        try { detail = JSON.stringify(await resp.json()); } catch { /* ignore */ }
        throw new Error('Fallback edge fetch failed ' + detail);
      }
      const json = await resp.json();
      return json.reviewText || 'Unable to generate review';
    } catch (fallbackErr) {
      console.error('[AI REVIEW] Fallback fetch also failed', fallbackErr);
      throw new Error('Failed to generate review. Please try again later.');
    }
  }
  return 'Unable to generate review';
}

interface SequenceTemplateAI {
  messageTemplate: string;
  sequenceDays: number;
  sequenceOrder: number;
}

interface GenerateSequenceParams {
  theme: string;
  details: string;
  numMessages: number;
  language: string;
  profileType: string;
  clinicName: string;
  clinicPhone: string;
  businessContext?: BusinessContext | null;
  clinicKeywords?: string;
}

export async function generateSequenceTemplatesAI(params: GenerateSequenceParams): Promise<SequenceTemplateAI[]> {
  try {
    // Use Supabase edge function instead of direct Gemini API call
    const { data, error } = await supabase.functions.invoke('generate-sequence-templates', {
      body: {
        theme: params.theme,
        details: params.details,
        numMessages: params.numMessages,
        language: params.language,
        profileType: params.profileType,
        clinicName: params.clinicName,
        clinicPhone: params.clinicPhone,
        businessContext: params.businessContext,
        clinicKeywords: params.clinicKeywords
      }
    });

    if (error) {
      console.error('Error from edge function:', error);
      throw new Error('Failed to generate sequence templates');
    }

    if (!data || !data.templates) {
      throw new Error('Invalid response from server');
    }

    return data.templates;
  } catch (error) {
    console.error('Error generating sequence templates:', error);
    throw new Error('Failed to generate sequence templates. Please try again later.');
  }
}
