/**
 * Send WhatsApp document (base64)
 * POST /api/whatsapp-send-document
 * Body: { userId: string, to: string, fileBase64: string, fileName: string, mimeType: string, caption?: string }
 */

import { Handler } from '@netlify/functions';
import { forwardToWhatsApp, parseRequestBody, error, corsHeaders } from './_shared/whatsappClient';
import { getUserIdFromAuthId } from './_shared/userLookup';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return error('Method not allowed', 405);
  }

  try {
    const body = parseRequestBody(event.body);
    const { userId: authId, to, fileBase64, fileName, mimeType, caption } = body;

    if (!authId || !to || !fileBase64 || !fileName || !mimeType) {
      return error('Missing required fields: userId, to, fileBase64, fileName, mimeType', 400);
    }

    // Look up backend user ID
    const backendUserId = await getUserIdFromAuthId(authId);
    if (!backendUserId) {
      return error('User not found in WhatsApp backend', 404);
    }

    // Forward to backend - backend expects 'phone' field
    const response = await forwardToWhatsApp(
      `/api/users/${backendUserId}/whatsapp/send-document`,
      'POST',
      { phone: to, fileBase64, fileName, mimeType, caption }
    );

    return response;
  } catch (err) {
    console.error('[WhatsApp Send Document] Error:', err);
    return error('Failed to send document', 500);
  }
};
