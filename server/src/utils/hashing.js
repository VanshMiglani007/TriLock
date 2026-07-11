const crypto = require('crypto');

/**
 * Generates SHA-256 hash of data
 * @param {string|object} data - Data to hash
 * @returns {string} Hex-encoded SHA-256 hash
 */
function generateHash(data) {
  const input = typeof data === 'object' ? JSON.stringify(data) : String(data);
  return crypto
    .createHash('sha256')
    .update(input)
    .digest('hex');
}

/**
 * Verifies data against an expected hash
 * @param {string|object} data - Data to verify
 * @param {string} expectedHash - Expected SHA-256 hash
 * @returns {boolean} Whether the hash matches
 */
function verifyHash(data, expectedHash) {
  const computedHash = generateHash(data);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(expectedHash, 'hex')
  );
}

/**
 * Generates a hash for a file buffer
 * @param {Buffer} fileBuffer - File content buffer
 * @returns {string} Hex-encoded SHA-256 hash
 */
function hashFile(fileBuffer) {
  return crypto
    .createHash('sha256')
    .update(fileBuffer)
    .digest('hex');
}

/**
 * Creates a chained hash for audit log immutability
 * Combines current log data with previous hash to create a blockchain-like chain
 * @param {object} logData - Current log entry data
 * @param {string} previousHash - Hash of the previous log entry
 * @returns {string} Chained hash
 */
function chainedHash(logData, previousHash) {
  const combined = JSON.stringify(logData) + previousHash;
  return crypto
    .createHash('sha256')
    .update(combined)
    .digest('hex');
}

/**
 * Generates an HMAC for data authentication
 * @param {string} data - Data to authenticate
 * @param {string} secret - HMAC secret key
 * @returns {string} Hex-encoded HMAC
 */
function generateHMAC(data, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

module.exports = {
  generateHash,
  verifyHash,
  hashFile,
  chainedHash,
  generateHMAC
};
