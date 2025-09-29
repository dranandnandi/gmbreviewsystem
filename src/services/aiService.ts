import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabaseClient';

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
        seedPatientHint: params.seedPatientHint
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
          seedPatientHint: params.seedPatientHint
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
}

export async function generateSequenceTemplatesAI(params: GenerateSequenceParams): Promise<SequenceTemplateAI[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const languageNames = {
      en: 'English',
      hi: 'Hindi',
      gu: 'Gujarati',
      mr: 'Marathi'
    };

    const prompt = `Create ${params.numMessages} WhatsApp-friendly sequence messages for a healthcare clinic in ${languageNames[params.language as keyof typeof languageNames] || 'English'}.

Theme: ${params.theme}
Details: ${params.details}
Profile Type: ${params.profileType}
Clinic: ${params.clinicName}

STRUCTURE REQUIREMENTS:
1. Each message must follow this structure:
   - Greeting: Start with "Hello {patient_name},"
   - Main Content: Educational/informational content related to the theme
   - Call to Action: Encourage contact or visit
   - Closing: End with clinic name and contact info

2. Use these placeholders (DO NOT replace them):
   - {patient_name} - for patient's name
   - {clinic_name} - for clinic name
   - {clinic_phone} - for clinic phone number

3. WhatsApp-friendly formatting:
   - Use emojis appropriately (📞, 🏥, 📅, ✅, etc.)
   - Keep messages under 300 words
   - Use line breaks for readability
   - Bold important text with **text**

4. Sequence timing:
   - Message 1: 7-15 days after visit
   - Message 2: 25-35 days after visit
   - Message 3: 50-65 days after visit
   - Continue pattern with 20-30 day gaps

5. Content progression:
   - Early messages: General health tips and check-in
   - Middle messages: Specific advice related to theme
   - Later messages: Preventive care and follow-up reminders

RESPONSE FORMAT (JSON):
Return ONLY a valid JSON array with this exact structure:
[
  {
    "messageTemplate": "Hello {patient_name},\\n\\nYour message content here...\\n\\n✅ Contact us at:\\n📞 {clinic_name} | {clinic_phone}",
    "sequenceDays": 15,
    "sequenceOrder": 1
  },
  {
    "messageTemplate": "Hello {patient_name},\\n\\nSecond message content...\\n\\n✅ For more information:\\n📞 {clinic_name} | {clinic_phone}",
    "sequenceDays": 30,
    "sequenceOrder": 2
  }
]

IMPORTANT:
- Return ONLY the JSON array, no additional text
- Ensure proper JSON escaping for line breaks (\\n)
- Make content relevant to ${params.theme} and ${params.profileType}
- Include educational value in each message
- Maintain professional yet friendly tone`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text().trim();

    try {
      // Clean the response to ensure it's valid JSON
      const cleanedResponse = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      const templates = JSON.parse(cleanedResponse);
      
      // Validate the response structure
      if (!Array.isArray(templates)) {
        throw new Error('Response is not an array');
      }

      // Validate each template
      const validatedTemplates = templates.map((template, index) => {
        if (!template.messageTemplate || !template.sequenceDays || !template.sequenceOrder) {
          throw new Error(`Invalid template structure at index ${index}`);
        }
        
        return {
          messageTemplate: template.messageTemplate,
          sequenceDays: parseInt(template.sequenceDays),
          sequenceOrder: parseInt(template.sequenceOrder)
        };
      });

      return validatedTemplates;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw response:', responseText);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  } catch (error) {
    console.error('Error generating sequence templates:', error);
    throw new Error('Failed to generate sequence templates. Please try again later.');
  }
}