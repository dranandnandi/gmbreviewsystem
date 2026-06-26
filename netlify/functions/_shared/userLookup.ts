/**
 * User Lookup Utility - READ ONLY
 * Works with existing Neon users table schema (no modifications)
 * Schema: id, auth_id, username, password_hash, name, role, clinic_name, etc.
 * Matches OPD app structure
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.WHATSAPP_DB_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
});

type EnsureUserOptions = {
  authId?: string;
  username?: string;
  role?: string;
};

function buildSafeUsername(authId: string, email?: string, preferredUsername?: string): string {
  if (preferredUsername && preferredUsername.trim()) {
    return preferredUsername.trim();
  }

  if (email && email.trim()) {
    return email.trim().toLowerCase();
  }

  return `user-${authId.slice(0, 8)}`;
}

/**
 * Get Neon user ID from Supabase auth_id - READ ONLY
 * This matches the OPD app structure where userId = Supabase auth_id
 */
export async function getUserIdFromAuthId(authId: string): Promise<string | null> {
  try {
    console.log(`[User Lookup] Looking up user with auth_id: ${authId}`);
    
    // Look up by auth_id (Supabase user ID)
    const result = await pool.query(
      'SELECT id, auth_id, username, name FROM users WHERE auth_id = $1',
      [authId]
    );

    if (result.rows.length === 0) {
      console.warn(`[User Lookup] No user found for auth_id: ${authId}`);
      return null;
    }

    console.log(`[User Lookup] Found user:`, result.rows[0]);
    return result.rows[0].id;
  } catch (error) {
    console.error('[User Lookup] Database error:', error);
    throw error;
  }
}

/**
 * Ensure user exists in database - READ ONLY
 * Just checks if user exists, does NOT modify anything
 */
export async function ensureUserExists(
  userId: string,
  email?: string,
  fullName?: string,
  options?: EnsureUserOptions
): Promise<string> {
  try {
    const authId = options?.authId || userId;

    // Prefer direct mapping via auth_id or id.
    const byAuthResult = await pool.query(
      'SELECT id FROM users WHERE auth_id::text = $1 OR id::text = $2 LIMIT 1',
      [authId, userId]
    );

    if (byAuthResult.rows.length > 0) {
      const backendUserId = byAuthResult.rows[0].id;
      console.log(`[User Lookup] Found user by auth/id: ${authId}/${userId} -> ${backendUserId}`);
      return backendUserId;
    }

    // Create a backend row keyed by public.users.id. Never attach a new user
    // to an older row merely because the display username happens to match.
    const preferredUsername = buildSafeUsername(userId, email, options?.username);
    const usernameResult = await pool.query(
      'SELECT id FROM users WHERE username = $1 LIMIT 1',
      [preferredUsername]
    );
    const username = usernameResult.rows.length > 0
      ? `${preferredUsername}-${userId.slice(0, 8)}`
      : preferredUsername;
    const name = (fullName && fullName.trim()) || username;
    const role = options?.role || 'admin';

    await pool.query(
      `
        INSERT INTO users (id, auth_id, username, password_hash, name, role, created_at, updated_at)
        VALUES ($1::uuid, $2, $3, NULL, $4, $5, NOW(), NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          auth_id = EXCLUDED.auth_id,
          username = COALESCE(users.username, EXCLUDED.username),
          name = COALESCE(users.name, EXCLUDED.name),
          role = COALESCE(users.role, EXCLUDED.role),
          updated_at = NOW()
      `,
      [userId, authId, username, name, role]
    );

    console.log(`[User Lookup] Created backend user mapping: ${authId} -> ${userId}`);
    return userId;
  } catch (error) {
    console.error('[User Lookup] Failed to lookup user:', error);
    throw error;
  }
}
