type PublicUserRecord = {
  id?: string;
  auth_id?: string | null;
  username?: string | null;
  contact_email?: string | null;
  name?: string | null;
  role?: string | null;
};

type DatabaseWebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: PublicUserRecord;
};

const DEFAULT_BACKEND_URL =
  'https://gmbreviewsystem.com/.netlify/functions/webhook-sync-user';

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getRecord(payload: DatabaseWebhookPayload | PublicUserRecord): PublicUserRecord | null {
  if ('record' in payload || 'type' in payload || 'table' in payload || 'schema' in payload) {
    return payload.record || null;
  }

  return payload as PublicUserRecord;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const configuredSecret = Deno.env.get('SYNC_USER_WEBHOOK_SECRET');
    const suppliedSecret = req.headers.get('x-webhook-secret');

    if (configuredSecret && suppliedSecret !== configuredSecret) {
      return jsonResponse({ success: false, error: 'Unauthorized webhook' }, 401);
    }

    const payload = await req.json() as DatabaseWebhookPayload | PublicUserRecord;
    const record = getRecord(payload);

    if (!record?.id) {
      return jsonResponse({ success: false, error: 'Webhook record.id is required' }, 400);
    }

    const username =
      record.username?.trim() ||
      record.contact_email?.trim().toLowerCase() ||
      record.id;
    const fullName =
      record.name?.trim() ||
      record.username?.trim() ||
      record.contact_email?.trim() ||
      record.id;

    // The application uses public.users.id for every WhatsApp backend request.
    const backendPayload = {
      userId: record.id,
      id: record.id,
      auth_id: record.auth_id || record.id,
      username,
      email: record.contact_email || username,
      fullName,
      name: fullName,
      role: record.role || 'admin',
    };

    const backendUrl = Deno.env.get('WHATSAPP_USER_SYNC_URL') || DEFAULT_BACKEND_URL;
    const backendSecret = Deno.env.get('WHATSAPP_USER_SYNC_SECRET');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (backendSecret) {
      headers['x-webhook-secret'] = backendSecret;
    }

    console.log('Syncing public user to WhatsApp backend', {
      userId: record.id,
      username,
    });

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(backendPayload),
    });

    const responseText = await response.text();
    let result: unknown = responseText;

    try {
      result = responseText ? JSON.parse(responseText) : null;
    } catch {
      // Preserve non-JSON backend responses for diagnostics.
    }

    if (!response.ok) {
      console.error('WhatsApp backend user sync failed', {
        status: response.status,
        userId: record.id,
        result,
      });

      return jsonResponse({
        success: false,
        error: 'WhatsApp backend user sync failed',
        backendStatus: response.status,
        result,
      }, 502);
    }

    return jsonResponse({
      success: true,
      userId: record.id,
      result,
    }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('sync-user-to-neon failed', message);
    return jsonResponse({ success: false, error: message }, 500);
  }
});
