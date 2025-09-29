// supabase/functions/generate-review-bundle/index.ts
// Returns 1 or 3 localized WhatsApp-friendly messages for a review flow.
// Deploy with: supabase functions deploy generate-review-bundle --no-verify-jwt
// Secrets: ALLGOOGLE_KEY must be set (same as generate-review) if using Gemini.

// Allow TypeScript in VS Code to recognize the Deno globals in this file
// without requiring Deno type libs in the project.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400'
  };
}

type Flow = 'ai3' | 'simple1';

interface BundleRequest {
  language: string; // e.g., 'hi', 'gu', 'mr', 'ta'
  flow: Flow;
  context: {
    patientName: string;
    clinicName: string;
    clinicAddress?: string;
    gmbLink?: string;
    date: string; // human-readable
    treatment?: string;
    notes?: string;
    termsToKeep?: string[]; // technical/proper nouns to keep in English
  };
}

interface BundleResponse {
  language: string;
  flow: Flow;
  messages: string[]; // 1 or 3 messages
  model?: string;
  terms_kept?: string[];
  created_at: string;
}

const MODEL = 'gemini-2.0-flash-lite';
const GOOGLE_API_KEY = (typeof Deno !== 'undefined' && Deno?.env?.get) ? Deno.env.get('ALLGOOGLE_KEY') : undefined;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', gu: 'Gujarati', mr: 'Marathi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi', ur: 'Urdu'
};

// Expected script ranges to validate output roughly matches target language
function scriptRegexFor(lang: string): RegExp | null {
  switch (lang) {
    case 'hi': // Devanagari
    case 'mr':
      return /[\u0900-\u097F]/;
    case 'gu': // Gujarati
      return /[\u0A80-\u0AFF]/;
    case 'pa': // Gurmukhi
      return /[\u0A00-\u0A7F]/;
    case 'bn': // Bengali
      return /[\u0980-\u09FF]/;
    case 'ta': // Tamil
      return /[\u0B80-\u0BFF]/;
    case 'te': // Telugu
      return /[\u0C00-\u0C7F]/;
    case 'kn': // Kannada
      return /[\u0C80-\u0CFF]/;
    case 'ml': // Malayalam
      return /[\u0D00-\u0D7F]/;
    case 'ur': // Arabic script (Urdu)
      return /[\u0600-\u06FF]/;
    default:
      return null;
  }
}

function messagesMatchTargetLanguage(messages: string[], lang: string): boolean {
  if (!messages?.length) return false;
  const re = scriptRegexFor(lang);
  if (!re) {
    // If we don't have a script validator (e.g., en), accept
    return lang === 'en';
  }
  // Consider valid if at least one target-script character appears in any message
  return messages.some(m => re.test(m));
}

async function translateArrayToLanguage(original: string[], lang: string, termsToKeep: string[]): Promise<string[] | null> {
  const targetName = LANGUAGE_NAMES[lang] || 'English';
  const keep = termsToKeep.filter(Boolean).join(', ');
  const obj = { messages: original };
  const prompt = `Translate the JSON object's messages array into ${targetName} (language code: ${lang}) using native script.
Rules:
- Preserve the following terms exactly in English (Latin script): ${keep || '(none)'}
- Do not change the number of messages or their order.
- Return ONLY the JSON object with a messages array. No extra text.
JSON INPUT:\n${JSON.stringify(obj)}`;
  try {
    const text = await generateWithGemini(prompt);
    const parsed = safeParseJsonArray(text);
    return parsed;
  } catch {
    return null;
  }
}

async function generateWithGemini(prompt: string): Promise<string> {
  if (!GOOGLE_API_KEY) throw new Error('Missing ALLGOOGLE_KEY secret');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${GOOGLE_API_KEY}`;
  const body = {
    contents: [
      { role: 'user', parts: [{ text: prompt }] }
    ]
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    let detail = '';
    try { detail = await resp.text(); } catch { /* ignore */ }
    throw new Error(`Gemini error ${resp.status}: ${detail}`);
  }
  const json = await resp.json();
  // Extract text from candidates
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || json?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data || '';
  return String(text).trim();
}

function buildPrompt(input: BundleRequest): string {
  const langCode = (input.language || 'en').toLowerCase();
  const targetName = LANGUAGE_NAMES[langCode] || 'English';
  const keepTerms = (input.context.termsToKeep || []).filter(Boolean).join(', ');

  const base = `You are a helpful assistant generating WhatsApp-friendly patient review messages in ${targetName} (language code: ${langCode}).
RULES:
- Write the output strictly in ${targetName} (native script) except the following proper nouns/technical terms which must remain in English (Latin script) exactly as provided: ${keepTerms || '(none)'}.
- Keep content concise, friendly, and professional.
- Do not include any markdown, code fences, or explanations.
- Return ONLY a valid JSON object per the schema below. No extra text.

INPUT CONTEXT (use to personalize):
- Patient Name: ${input.context.patientName}
- Clinic Name: ${input.context.clinicName}
- Clinic Address: ${input.context.clinicAddress || ''}
- Visit Date: ${input.context.date}
- Treatment: ${input.context.treatment || ''}
- Notes: ${input.context.notes || ''}
- Google Review Link: ${input.context.gmbLink || ''}

OUTPUT SCHEMA:
{
  "messages": string[]
}

REQUIREMENTS BY FLOW:
1) If flow = ai3, produce exactly 3 messages:
   - messages[0]: Thank-you message WITHOUT the review link; include visit details and a line like "You will receive a sample review in the next message which you can modify." in ${targetName}.
   - messages[1]: ONLY the sample review text itself (no greeting, no footer, no link) in ${targetName}.
   - messages[2]: Short message including ONLY the Google review link localized appropriately.

2) If flow = simple1, produce exactly 1 message:
   - messages[0]: Thank-you message WITH the Google review link, in ${targetName}.

IMPORTANT:
- Never translate or transliterate the terms to keep.
- Be sure the language of the messages is ${targetName}.
- Return only the JSON object.`;

  return base;
}

function safeParseJsonArray(text: string): string[] | null {
  try {
    // Some models return JSON object or array; we expect object with messages array, but try both
    const cleaned = text.replace(/^```(json)?/g, '').replace(/```$/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed as string[];
    if (parsed && Array.isArray(parsed.messages)) return parsed.messages as string[];
  } catch { /* ignore */ }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }
  try {
    const body = (await req.json()) as BundleRequest;
    const now = new Date().toISOString();

    const prompt = buildPrompt(body);
    let messages: string[] | null = null;
    try {
      const text = await generateWithGemini(prompt);
      messages = safeParseJsonArray(text);
    } catch (aiErr) {
      // Fallback to null (we will provide a minimal English fallback below)
      console.warn('Gemini generation failed:', aiErr);
    }

    // If we got messages but they are not in the expected script for the target language, try a translation pass
    if (messages && body.language && body.language !== 'en' && !messagesMatchTargetLanguage(messages, body.language)) {
      const translated = await translateArrayToLanguage(messages, body.language, body.context.termsToKeep || []);
      if (translated && messagesMatchTargetLanguage(translated, body.language)) {
        messages = translated;
      }
    }

    if (!messages) {
      // Fallback minimal set in EN to avoid breaking, but flag the issue
      const fallback: string[] = body.flow === 'ai3'
        ? [
            `Hello ${body.context.patientName},\n\nWe hope you had a satisfying experience with the services at ${body.context.clinicName}.`,
            `I recently visited ${body.context.clinicName}. The environment was clean and the process was organized.`,
            `${body.context.gmbLink || ''}`
          ]
        : [
            `Hello ${body.context.patientName}, thank you for choosing ${body.context.clinicName}. ${body.context.gmbLink || ''}`
          ];
      messages = fallback;
    }

    const resp: BundleResponse = {
      language: body.language,
      flow: body.flow,
      messages,
      model: MODEL,
      terms_kept: body.context.termsToKeep || [],
      created_at: now
    };
    return new Response(JSON.stringify(resp), { headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
  } catch (e) {
    const msg = (e as any)?.message ? String((e as any).message) : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
  }
});
