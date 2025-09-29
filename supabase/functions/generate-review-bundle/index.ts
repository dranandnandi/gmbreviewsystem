// supabase/functions/generate-review-bundle/index.ts
// Returns 1 or 3 localized WhatsApp-friendly messages for a review flow.
// Deploy with: supabase functions deploy generate-review-bundle --no-verify-jwt
// Secrets: ALLGOOGLE_KEY must be set (same as generate-review) if using Gemini.

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }
  try {
    const body = (await req.json()) as BundleRequest;
    const now = new Date().toISOString();

    // For now, this is a placeholder that echoes a minimal structure.
    // The real implementation would call Gemini with a carefully crafted prompt per language.
    const msgs: string[] = [];
    if (body.flow === 'ai3') {
      msgs.push(
        // Message 1: localized thank-you without link
        `Hello ${body.context.patientName},\n\nWe hope you had a satisfying experience with the services at ${body.context.clinicName}. Your feedback is highly valuable to us.\n\nYour visit details:\n📅 Date: ${body.context.date}\n🏥 Name of Center: ${body.context.clinicName}\n📍 Location: ${body.context.clinicAddress || ''}\n\nYou will receive a sample review in the next message and which you can change or modify.\n\nBest regards,\nTeam ${body.context.clinicName}`
      );
      msgs.push(
        // Message 2: AI review text only (placeholder)
        `I recently visited ${body.context.clinicName}${body.context.treatment ? ' for ' + body.context.treatment : ''}. The environment was clean and the process was organized. I received my results quickly. Everything was handled efficiently.`
      );
      msgs.push(
        // Message 3: link message (localized)
        `You can submit your review here: ${body.context.gmbLink || ''}`
      );
    } else {
      // simple1
      msgs.push(
        `Hello ${body.context.patientName},\n\nThank you for choosing ${body.context.clinicName}. We hope you had a positive experience.\n\nYour visit details:\n📅 Date: ${body.context.date}\n🏥 Name of Center: ${body.context.clinicName}\n📍 Location: ${body.context.clinicAddress || ''}\n\nWe would greatly appreciate your review: ${body.context.gmbLink || ''}\n\nBest regards,\nTeam ${body.context.clinicName}`
      );
    }

    const resp: BundleResponse = {
      language: body.language,
      flow: body.flow,
      messages: msgs,
      model: 'gemini-2.0-flash-lite',
      terms_kept: body.context.termsToKeep || [],
      created_at: now
    };
    return new Response(JSON.stringify(resp), { headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
  }
});
