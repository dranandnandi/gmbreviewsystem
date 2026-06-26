/**
 * WhatsApp User Verification Service - READ ONLY
 * Verifies user exists in Neon database by email lookup
 * Does NOT modify any database fields
 */

import { whatsappApi } from './whatsappApi';

export class WhatsAppUserSyncService {
  /**
   * Verify current user exists in database
   * Uses email for lookup (no modifications)
   */
  static async syncCurrentUser(): Promise<void> {
    try {
      // Get user from localStorage (Zustand persistence)
      const storedState = localStorage.getItem('gmb-review-store');
      if (!storedState) {
        console.warn('No user state found, skipping verification');
        return;
      }

      const parsedState = JSON.parse(storedState);
      const user = parsedState?.state?.user;

      if (!user?.id) {
        console.warn('No user ID found, skipping verification');
        return;
      }

      // Extract user data
      const email = user.email || user.contactEmail || user.username;

      if (!email) {
        console.warn('No email found for user, cannot verify');
        return;
      }

      console.log('[WhatsApp] Verifying user exists:', email);

      // Just check status - this will verify user exists in DB via email lookup
      await whatsappApi.getStatus({ userId: email });

      console.log('[WhatsApp] User verified successfully');
    } catch (error) {
      console.error('[WhatsApp] User verification failed:', error);
      // Don't throw - verification failure shouldn't block app
    }
  }

  /**
   * Verify specific user exists (by email)
   */
  static async syncUser(userId: string, email: string, fullName: string): Promise<void> {
    try {
      // Use email for lookup
      await whatsappApi.getStatus({ userId: email });
      console.log('[WhatsApp] User verified:', email);
    } catch (error) {
      console.error('[WhatsApp] User verification failed:', error);
      throw error;
    }
  }
}
