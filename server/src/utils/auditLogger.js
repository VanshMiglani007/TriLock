const AuditLog = require('../models/AuditLog');
const { chainedHash } = require('./hashing');

/**
 * Append-only audit logger with hash chain for tamper detection
 */
class AuditLogger {
  /**
   * Creates an immutable audit log entry
   * @param {object} params - Log entry parameters
   * @returns {Promise<object>} Created audit log entry
   */
  static async log({
    action,
    actorId,
    actorRole = 'system',
    targetUserId = null,
    caseNumber = null,
    details,
    metadata = null
  }) {
    const MAX_RETRIES = 5;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Get the last log entry for hash chain
        const lastLog = await AuditLog.findOne()
          .sort({ sequenceNumber: -1 })
          .select('hash sequenceNumber')
          .lean();

        const previousHash = lastLog ? lastLog.hash : 'GENESIS';
        const sequenceNumber = lastLog ? lastLog.sequenceNumber + 1 : 1;

        // Create the log data for hashing
        const loggedAt = new Date().toISOString();
        const logData = {
          action,
          actorId: actorId ? actorId.toString() : null,
          actorRole,
          targetUserId: targetUserId ? targetUserId.toString() : null,
          caseNumber,
          details,
          sequenceNumber,
          timestamp: loggedAt
        };

        // Generate chained hash
        const hash = chainedHash(logData, previousHash);

        // Create the audit log entry
        const auditLog = await AuditLog.create({
          action,
          actorId,
          actorRole,
          targetUserId,
          caseNumber,
          details,
          metadata,
          hash,
          previousHash,
          sequenceNumber,
          loggedAt
        });

        return auditLog;
      } catch (error) {
        // Retry on duplicate key (race condition between concurrent inserts)
        if (error.code === 11000 && attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 10 * (attempt + 1)));
          continue;
        }
        console.error(`[AuditLogger] Error creating audit log: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Verifies the integrity of the entire audit chain
   * @returns {{ valid: boolean, brokenAt: number|null, totalEntries: number }}
   */
  static async verifyChain() {
    const logs = await AuditLog.find()
      .sort({ sequenceNumber: 1 })
      .lean();

    if (logs.length === 0) {
      return { valid: true, brokenAt: null, totalEntries: 0 };
    }

    let previousHash = 'GENESIS';

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // Verify sequence
      if (log.sequenceNumber !== i + 1) {
        return {
          valid: false,
          brokenAt: i + 1,
          totalEntries: logs.length,
          error: 'Sequence number mismatch'
        };
      }

      // Verify previous hash pointer
      if (log.previousHash !== previousHash) {
        return {
          valid: false,
          brokenAt: log.sequenceNumber,
          totalEntries: logs.length,
          error: 'Previous hash mismatch'
        };
      }

      // Recompute hash using stored loggedAt for deterministic verification
      const logData = {
        action: log.action,
        actorId: log.actorId ? log.actorId.toString() : null,
        actorRole: log.actorRole,
        targetUserId: log.targetUserId ? log.targetUserId.toString() : null,
        caseNumber: log.caseNumber,
        details: log.details,
        sequenceNumber: log.sequenceNumber,
        timestamp: log.loggedAt
      };

      const expectedHash = chainedHash(logData, previousHash);
      if (log.hash !== expectedHash) {
        return {
          valid: false,
          brokenAt: log.sequenceNumber,
          totalEntries: logs.length,
          error: 'Hash mismatch - possible tampering'
        };
      }

      previousHash = log.hash;
    }

    return {
      valid: true,
      brokenAt: null,
      totalEntries: logs.length
    };
  }
}

module.exports = AuditLogger;
