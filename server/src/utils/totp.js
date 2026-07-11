const crypto = require('crypto');

/**
 * TOTP-like rotating token generator
 * Generates a 6-digit code that changes every 30 seconds
 */
class TOTPGenerator {
  constructor(secret, interval = 30) {
    this.secret = secret;
    this.interval = interval; // seconds
  }

  /**
   * Gets the current time step
   */
  _getTimeStep() {
    return Math.floor(Date.now() / 1000 / this.interval);
  }

  /**
   * Generates a token for a given time step
   * @param {number} timeStep - Time step counter
   * @returns {string} 6-digit token
   */
  _generateForStep(timeStep) {
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32BE(0, 0);
    buffer.writeUInt32BE(timeStep, 4);

    const hmac = crypto
      .createHmac('sha256', this.secret)
      .update(buffer)
      .digest();

    // Dynamic truncation
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % 1000000;

    return code.toString().padStart(6, '0');
  }

  /**
   * Gets the current token
   * @returns {{ token: string, timeRemaining: number, expiresAt: number }}
   */
  getCurrentToken() {
    const timeStep = this._getTimeStep();
    const token = this._generateForStep(timeStep);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = this.interval - (currentTime % this.interval);
    const expiresAt = (timeStep + 1) * this.interval * 1000;

    return {
      token,
      timeRemaining,
      expiresAt,
      interval: this.interval
    };
  }

  /**
   * Verifies a token (checks current and previous window for clock skew)
   * @param {string} inputToken - Token to verify
   * @returns {boolean} Whether the token is valid
   */
  verifyToken(inputToken) {
    const timeStep = this._getTimeStep();
    // Check current and adjacent time steps for clock skew tolerance
    for (let i = -1; i <= 1; i++) {
      if (this._generateForStep(timeStep + i) === inputToken) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Creates a unique TOTP secret for a user+key combination
 */
function generateTOTPSecret(userId, keyType) {
  const base = `${process.env.TOTP_SECRET || 'trilock'}:${userId}:${keyType}:${Date.now()}`;
  return crypto.createHash('sha256').update(base).digest('hex');
}

/**
 * Creates a TOTP generator instance
 */
function createTOTPGenerator(secret, interval = 30) {
  return new TOTPGenerator(secret, interval);
}

module.exports = {
  TOTPGenerator,
  generateTOTPSecret,
  createTOTPGenerator
};
