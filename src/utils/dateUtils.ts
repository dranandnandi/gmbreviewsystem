/**
 * Utility functions for date calculations
 */

/**
 * Returns a random number of days to offset from the base sequence days
 * Range: -3 to +3 days (inclusive)
 * This helps prevent WhatsApp account bans by varying message send dates
 */
export function getRandomDaysOffset(): number {
  return Math.floor(Math.random() * 7) - 3; // Returns -3, -2, -1, 0, 1, 2, or 3
}

/**
 * Adds a random offset to the given number of days
 * @param baseDays - The base number of days from the sequence template
 * @returns The adjusted number of days with random offset applied
 */
export function getRandomizedSequenceDays(baseDays: number): number {
  const offset = getRandomDaysOffset();
  const result = baseDays + offset;
  
  // Ensure we don't go below 1 day
  return Math.max(1, result);
}