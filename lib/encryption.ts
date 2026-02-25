import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment variable
 * Must be exactly 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // If the key is a hex string, convert it to Buffer
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  
  // If the key is a base64 string, convert it to Buffer
  if (key.length === 44 && key.endsWith('=')) {
    const decoded = Buffer.from(key, 'base64');
    if (decoded.length === 32) {
      return decoded;
    }
  }
  
  // If the key is exactly 32 bytes as a string
  if (key.length === 32) {
    return Buffer.from(key, 'utf-8');
  }
  
  throw new Error(
    'ENCRYPTION_KEY must be exactly 32 bytes. ' +
    'Provide either a 64-character hex string, a 44-character base64 string, ' +
    'or a 32-character UTF-8 string.'
  );
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param plaintext - The text to encrypt
 * @returns Base64 encoded string containing IV, auth tag, and ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  let encrypted = cipher.update(plaintext, 'utf-8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV + authTag + ciphertext into a single buffer
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64'),
  ]);
  
  return combined.toString('base64');
}

/**
 * Decrypt a ciphertext string that was encrypted with AES-256-GCM
 * @param ciphertext - Base64 encoded string containing IV, auth tag, and ciphertext
 * @returns Decrypted plaintext string
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  
  const combined = Buffer.from(ciphertext, 'base64');
  
  // Extract IV, auth tag, and encrypted data
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, undefined, 'utf-8');
  decrypted += decipher.final('utf-8');
  
  return decrypted;
}

/**
 * Check if the encryption key is properly configured
 * @returns true if the key is valid, false otherwise
 */
export function isEncryptionKeyValid(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
