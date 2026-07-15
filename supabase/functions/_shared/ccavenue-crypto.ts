/**
 * CCAvenue AES-128 CBC Encryption/Decryption Utilities
 *
 * CCAvenue uses AES-128-CBC with a 16-byte key derived from MD5 hash of working key.
 * IV is the FIXED byte sequence 0x00..0x0f — this matches CCAvenue's official
 * integration kits (PHP/Java/Node). Using anything else corrupts the first
 * cipher block (merchant_id) and CCAvenue rejects with "Working Key is empty".
 */

// Deno std crypto: the built-in WebCrypto has no MD5 ("Unrecognized algorithm
// name" in the edge runtime), but CCAvenue's scheme requires an MD5-derived key.
import { crypto as stdCrypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Generate MD5 hash of the working key (returns hex string)
 */
async function md5(data: string): Promise<string> {
  const msgBuffer = encoder.encode(data);
  const hashBuffer = await stdCrypto.subtle.digest('MD5', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// NOTE: WebCrypto's AES-CBC applies/strips PKCS7 padding automatically —
// do NOT pad/unpad manually on top of it (double padding corrupts the
// round-trip with CCAvenue).

/**
 * Encrypt data using CCAvenue's AES-128-CBC scheme
 * @param plainText - The data to encrypt (query string format)
 * @param workingKey - CCAvenue working key
 * @returns Hex-encoded encrypted string
 */
export async function ccavenueEncrypt(plainText: string, workingKey: string): Promise<string> {
  // Get MD5 hash of working key (32 hex chars = 16 bytes)
  const keyHash = await md5(workingKey);
  const keyBytes = hexToBytes(keyHash);

  // CCAvenue's official kits use a fixed IV of bytes 0x00..0x0f
  const iv = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

  // Import key for AES-CBC
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC', length: 128 },
    false,
    ['encrypt']
  );

  // Encrypt (WebCrypto AES-CBC applies PKCS7 padding itself)
  const plainBytes = encoder.encode(plainText);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    plainBytes
  );

  return bytesToHex(new Uint8Array(encrypted));
}

/**
 * Decrypt data using CCAvenue's AES-128-CBC scheme
 * @param encryptedText - Hex-encoded encrypted string from CCAvenue
 * @param workingKey - CCAvenue working key
 * @returns Decrypted query string
 */
export async function ccavenueDecrypt(encryptedText: string, workingKey: string): Promise<string> {
  // Get MD5 hash of working key
  const keyHash = await md5(workingKey);
  const keyBytes = hexToBytes(keyHash);

  // CCAvenue's official kits use a fixed IV of bytes 0x00..0x0f
  const iv = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

  // Import key for AES-CBC
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC', length: 128 },
    false,
    ['decrypt']
  );

  // Convert hex to bytes and decrypt (WebCrypto strips PKCS7 padding itself)
  const encryptedBytes = hexToBytes(encryptedText);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    encryptedBytes
  );

  return decoder.decode(new Uint8Array(decrypted));
}

/**
 * Parse CCAvenue response query string into object
 */
export function parseResponse(queryString: string): Record<string, string> {
  const params: Record<string, string> = {};
  const pairs = queryString.split('&');

  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
    }
  }

  return params;
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, string | number | undefined>): string {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}
