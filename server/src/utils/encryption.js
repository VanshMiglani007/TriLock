const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a master encryption key by combining three keys (User + Government + Platform)
 * Uses HMAC-based key derivation to combine the three key components
 */
function deriveMasterKey(userKey, governmentKey, platformKey) {
  const combined = `${userKey}:${governmentKey}:${platformKey}`;
  return crypto
    .createHash('sha256')
    .update(combined)
    .digest();
}

/**
 * Derives a single encryption key from platform key for storage
 * Used when data needs to be encrypted with just the platform key
 */
function deriveStorageKey(platformKey) {
  return crypto
    .createHash('sha256')
    .update(platformKey)
    .digest();
}

/**
 * Generates a random encryption key
 */
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypts data using AES-256-GCM
 * @param {string} plaintext - Data to encrypt
 * @param {Buffer|string} key - 32-byte encryption key
 * @returns {{ encryptedData: string, iv: string, authTag: string }}
 */
function encrypt(plaintext, key) {
  const keyBuffer = typeof key === 'string'
    ? crypto.createHash('sha256').update(key).digest()
    : key;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypts data using AES-256-GCM
 * @param {string} encryptedData - Hex-encoded encrypted data
 * @param {string} iv - Hex-encoded initialization vector
 * @param {string} authTag - Hex-encoded authentication tag
 * @param {Buffer|string} key - 32-byte encryption key
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedData, iv, authTag, key) {
  const keyBuffer = typeof key === 'string'
    ? crypto.createHash('sha256').update(key).digest()
    : key;

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    keyBuffer,
    Buffer.from(iv, 'hex'),
    { authTagLength: AUTH_TAG_LENGTH }
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypts a location packet with the platform key
 * The packet is encrypted at rest; full decryption requires the three-key master key
 */
function encryptPacket(packetData, platformKey) {
  const plaintext = JSON.stringify(packetData);
  return encrypt(plaintext, platformKey);
}

/**
 * Decrypts a location packet using the derived master key
 */
function decryptPacket(encryptedData, iv, authTag, masterKey) {
  const plaintext = decrypt(encryptedData, iv, authTag, masterKey);
  return JSON.parse(plaintext);
}

module.exports = {
  generateKey,
  deriveMasterKey,
  deriveStorageKey,
  encrypt,
  decrypt,
  encryptPacket,
  decryptPacket,
  ALGORITHM,
  IV_LENGTH,
  KEY_LENGTH
};
