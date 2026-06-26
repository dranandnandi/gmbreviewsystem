/**
 * Send WhatsApp report via URL
 * POST /api/whatsapp-send-report-url
 * Body: { userId: string, to: string, reportUrl: string, fileName: string, mimeType: string, caption?: string }
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
    const { userId: authId, to, reportUrl, fileName, mimeType, caption } = body;

    if (!authId || !to || !reportUrl || !fileName || !mimeType) {
      return error('Missing required fields: userId, to, reportUrl, fileName, mimeType', 400);
    }

    // Look up backend user ID
    const backendUserId = await getUserIdFromAuthId(authId);
    if (!backendUserId) {
      return error('User not found in WhatsApp backend', 404);
    }

    // Forward to backend
    const response = await forwardToWhatsApp(
      `/api/users/${backendUserId}/whatsapp/send-report-url`,
      'POST',
      { to, reportUrl, fileName, mimeType, caption }
    );

    return response;
  } catch (err) {
    console.error('[WhatsApp Send Report URL] Error:', err);
    return error('Failed to send report', 500);
  }
};
