export {};
// supabase/functions/generate-review-bundle/index.ts
// Strict, no-fallback version that enforces exact WhatsApp-friendly format and Gunglish terms.

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

const GOOGLE_API_KEY =
  (typeof Deno !== 'undefined' && Deno?.env?.get) ? Deno.env.get('ALLGOOGLE_KEY') : undefined;

// Use one model (you can switch to -pro if you prefer)
const FIXED_MODEL = 'gemini-2.5-flash';
const GEN_MODELS = [FIXED_MODEL];
const TX_MODELS  = [FIXED_MODEL];

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', gu: 'Gujarati', mr: 'Marathi', bn: 'Bengali',
  ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi', ur: 'Urdu'
};

/**
 * 1) Global English words you want to always keep in English (Latin) across ALL languages.
 * 2) Optional per-language additions for tone.
 * Edit these lists to tune your “Gunglish/Hinglish/etc.” flavor.
 */
const COMMON_LATIN_GLOBAL: string[] = [
  'review','reviews','rating','feedback','experience','service','services',
  'staff','team','support','clinic','lab','report','results','process',
  'clean','organized','professional','friendly','Google','Link','WhatsApp',
  'thank you','Best regards','Doctor','Dr','nurse','test','tests','appointment',
  'quick','helpful','recommend','diabetes','pathology'
];

const COMMON_LATIN_BY_LANG: Record<string, string[]> = {
  gu: ['review','rating','feedback','experience','service','services','staff','team','clinic','lab','report','results','process','clean','organized','professional','friendly','Google','Link','WhatsApp','recommend'],
  hi: ['review','rating','feedback','experience','service','services','staff','team','clinic','lab','report','results','process','clean','organized','professional','friendly','Google','Link','WhatsApp','recommend'],
  bn: ['review','rating','feedback','experience','service','services','staff','team','clinic','lab','report','results','process','clean','organized','professional','friendly','Google','Link','WhatsApp','recommend']
};

function mergedLatinWhitelist(lang: string, termsToKeep: string[] = []): string[] {
  const base = COMMON_LATIN_GLOBAL;
  const perLang = COMMON_LATIN_BY_LANG[lang] || [];
  // Caller terms first (highest priority), then per-language, then global.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...termsToKeep, ...perLang, ...base]) {
    const s = String(t).trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

// ---------- script detection ----------
function scriptRegexFor(lang: string): RegExp | null {
  switch (lang) {
    case 'hi':
    case 'mr': return /[\u0900-\u097F]/; // Devanagari
    case 'gu': return /[\u0A80-\u0AFF]/; // Gujarati
    case 'pa': return /[\u0A00-\u0A7F]/; // Gurmukhi
    case 'bn': return /[\u0980-\u09FF]/; // Bengali
    case 'ta': return /[\u0B80-\u0BFF]/; // Tamil
    case 'te': return /[\u0C00-\u0C7F]/; // Telugu
    case 'kn': return /[\u0C80-\u0CFF]/; // Kannada
    case 'ml': return /[\u0D00-\u0D7F]/; // Malayalam
    case 'ur': return /[\u0600-\u06FF]/; // Arabic (Urdu)
    default:   return null;
  }
}
const MIN_CHARS = 6;
function messagesMatchTargetLanguage(messages: string[], lang: string): boolean {
  const re = scriptRegexFor(lang);
  if (!re) return lang === 'en';
  const joined = messages.join(' ');
  let count = 0;
  for (const ch of joined) {
    if (re.test(ch)) count++;
    if (count >= MIN_CHARS) return true;
  }
  return false;
}

// ---------- JSON helpers ----------
function safeParseJsonMessages(text: string): string[] | null {
  try {
    const cleaned = String(text).trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed as string[];
    if (parsed && Array.isArray((parsed as any).messages)) return (parsed as any).messages as string[];
  } catch {}
  return null;
}

// ---------- Gemini call (JSON only) ----------
async function callGeminiJSON(
  modelCandidates: string[],
  userParts: { text: string }[],
  systemText?: string
): Promise<{ text: string; modelUsed: string }> {
  if (!GOOGLE_API_KEY) throw new Error('Missing ALLGOOGLE_KEY secret');

  let lastErr: string | null = null;
  for (const model of modelCandidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${GOOGLE_API_KEY}`;
      const body: any = {
        contents: [{ role: 'user', parts: userParts }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1, // keep it deterministic
          topK: 40,
          topP: 0.9
        }
      };
      if (systemText) {
        body.systemInstruction = { role: 'system', parts: [{ text: systemText }] };
      }
      const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (!resp.ok) {
        let detail = ''; try { detail = await resp.text(); } catch {}
        lastErr = `Gemini error ${resp.status} for ${model}: ${detail}`;
        continue;
      }
      const json = await resp.json();
      const text =
        json?.candidates?.[0]?.content?.parts?.[0]?.text ??
        json?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data ?? '';
      if (text && String(text).trim().length > 0) {
        return { text: String(text).trim(), modelUsed: model };
      }
      lastErr = `Empty content for ${model}`;
    } catch (e: any) {
      lastErr = `Request failed for ${model}: ${e?.message || e}`;
    }
  }
  throw new Error(lastErr || 'All model candidates failed');
}

// ---------- prompts (Exact format + Gunglish) ----------
/**
 * EXACT FORMAT you asked for (message[0]):
 *
 * Hello {patientName},
 *
 * We hope you had a satisfying experience with the services at {clinicName}. Your feedback is highly valuable to us.
 *
 * Your visit details:
 * 📅 Date: {date}
 * 🏥 Name of Center: {clinicName}
 * 📍 Location: {clinicAddress}
 *
 * You will receive a sample review in the next message and which you can change or modify.
 *
 * Best regards,
 * Team {clinicName}
 *
 * message[1]: plain sample review line(s) ONLY (no greeting/footer/link)
 * message[2]: ONLY the Google review link (no extra words)
 */

function buildSystemInstruction(langCode: string, termsToKeep: string[], clinicName?: string): string {
  const targetName = LANGUAGE_NAMES[langCode] || 'English';
  const keepList = mergedLatinWhitelist(langCode, termsToKeep);
  const keep = keepList.length ? keepList.join(', ') : '(none)';

  return [
    `ROLE: You are a localization engine.`,
    `STYLE: Write sentences primarily in ${targetName} (${langCode}) native script,`,
    `but keep the following words/phrases in ENGLISH (Latin) exactly as-is to achieve a natural mixed style: ${keep}`,
    `ALLOWED English letters ONLY for:`,
    `- The protected Latin words above,`,
    `- URLs, emoji, and numbers.`,
    `Do NOT add timestamps, sender names, or message prefixes.`,
    `Output ONLY valid JSON per instructions. No comments/explanations.`
  ].join('\n');
}

function buildGenUserPrompt(input: any): string {
  const langCode = (input.language || 'en').toLowerCase();
  const targetName = LANGUAGE_NAMES[langCode] || 'English';
  const keepList = mergedLatinWhitelist(langCode, input.context?.termsToKeep || []);
  const keepTerms = keepList.join(', ') || '(none)';

  const p = input.context || {};
  const patientName = p.patientName || '';
  const clinicName = p.clinicName || '';
  const clinicAddress = p.clinicAddress || '';
  const date = p.date || '';
  const gmbLink = p.gmbLink || '';

  return `TASK: Generate WhatsApp-friendly patient review messages in a MIXED style:
- Sentences in ${targetName} (${langCode}) native script.
- Keep the following in ENGLISH (Latin) exactly: ${keepTerms}.
- Maintain the EXACT format and line breaks shown below.

REQUIRED OUTPUT (JSON only): {"messages": string[]}

FORMAT REQUIREMENTS:

messages[0] MUST match this template exactly (preserve blank lines and emoji labels):
Hello ${patientName},

We hope you had a satisfying experience with the services at ${clinicName}. Your feedback is highly valuable to us.

Your visit details:
📅 Date: ${date}
🏥 Name of Center: ${clinicName}
📍 Location: ${clinicAddress}

You will receive a sample review in the next message and which you can change or modify.

Best regards,
Team ${clinicName}

Note:
- Write the sentences in ${targetName} native script, but keep the protected English words exactly as English (Latin).
- Do NOT translate the clinic name or URLs.
- Do NOT add any extra lines above/below this block.

messages[1]:
- ONLY the sample review text (no greeting, no footer, no link).
- 1–3 sentences max, mixed style (local script + protected English words).
- Keep ${clinicName} as-is (Latin).

messages[2]:
- ONLY the Google review link: ${gmbLink}
- No extra text/words/emojis around it.

Return ONLY the JSON object with {"messages": [...]}.`;
}

function buildTranslateUserPrompt(messages: string[], langCode: string, termsToKeep: string[], context: any): string {
  const targetName = LANGUAGE_NAMES[langCode] || 'English';
  const keepList = mergedLatinWhitelist(langCode, termsToKeep);
  const keep = keepList.join(', ') || '(none)';
  const p = context || {};
  const patientName = p.patientName || '';
  const clinicName = p.clinicName || '';
  const clinicAddress = p.clinicAddress || '';
  const date = p.date || '';
  const gmbLink = p.gmbLink || '';

  const inputObj = { messages };

  return `Translate and ADAPT the messages into a MIXED style:
- Sentences in ${targetName} (${langCode}) native script.
- Keep these in ENGLISH (Latin) exactly: ${keep}
- Enforce the SAME exact format as below for message[0].

FORMAT to enforce for messages[0]:
Hello ${patientName},

We hope you had a satisfying experience with the services at ${clinicName}. Your feedback is highly valuable to us.

Your visit details:
📅 Date: ${date}
🏥 Name of Center: ${clinicName}
📍 Location: ${clinicAddress}

You will receive a sample review in the next message and which you can change or modify.

Best regards,
Team ${clinicName}

messages[1]: sample review only (no greeting/footer/link), 1–3 sentences, mixed style.
messages[2]: ONLY this link: ${gmbLink}

INPUT JSON:
${JSON.stringify(inputObj)}

Return ONLY: {"messages": string[]}`;
}

// ---------- single-pass helpers (no fallback) ----------
async function translateOnce(
  original: string[], lang: string, termsToKeep: string[], context: any
): Promise<{ messages: string[] | null; model?: string; raw?: string }> {
  const system = buildSystemInstruction(lang, termsToKeep, context?.clinicName);
  const user = buildTranslateUserPrompt(original, lang, termsToKeep, context);
  const { text, modelUsed } = await callGeminiJSON(TX_MODELS, [{ text: user }], system);
  const parsed = safeParseJsonMessages(text);
  return { messages: parsed, model: modelUsed, raw: text };
}

async function generateOnce(
  input: any
): Promise<{ messages: string[] | null; model?: string; raw?: string }> {
  const system = buildSystemInstruction(input.language, input.context?.termsToKeep || [], input.context?.clinicName);
  const user = buildGenUserPrompt(input);
  const { text, modelUsed } = await callGeminiJSON(GEN_MODELS, [{ text: user }], system);
  const parsed = safeParseJsonMessages(text);
  return { messages: parsed, model: modelUsed, raw: text };
}

// ---------- handler ----------
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const lang = (body.language || 'en').toLowerCase();
    const terms = Array.isArray(body.context?.termsToKeep) ? body.context.termsToKeep : [];
    const flow: Flow = body.flow;

    let result: { messages: string[] | null; model?: string; raw?: string };

    if (Array.isArray(body.messages) && body.messages.length > 0) {
      // translate-only
      result = await translateOnce(body.messages, lang, terms, body.context || {});
    } else {
      // generate-only
      result = await generateOnce(body);
    }

    // 1) Parse failure → 422 with raw
    if (!result.messages) {
      return new Response(JSON.stringify({
        error: 'parse_failed',
        detail: 'Model did not return valid JSON {"messages": string[]}.',
        model: result.model,
        raw: result.raw
      }), { status: 422, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
    }

    // 2) Script check: require some target script present
    if (lang !== 'en' && !messagesMatchTargetLanguage(result.messages, lang)) {
      return new Response(JSON.stringify({
        error: 'language_mismatch',
        detail: `Output is not in target script for language="${lang}".`,
        model: result.model,
        sample: result.messages.slice(0, 2),
        raw: result.raw
      }), { status: 422, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
    }

    // 3) OK
    const resp = {
      language: lang,
      flow,
      messages: result.messages,
      model: result.model,
      // Echo combined keep list for debugging/inspection
      terms_kept: mergedLatinWhitelist(lang, terms),
      created_at: now,
      translated: Boolean(Array.isArray(body.messages) && body.messages.length > 0)
    };
    return new Response(JSON.stringify(resp), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });

  } catch (e: any) {
    const msg = e?.message ? String(e.message) : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  }
});
