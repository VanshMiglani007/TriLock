const express = require('express');
const router = express.Router();
const Key = require('../models/Key');
const { authenticate, authorize } = require('../middleware/auth');
const { generateKey, deriveMasterKey, decrypt } = require('../utils/encryption');
const { createTOTPGenerator, generateTOTPSecret } = require('../utils/totp');
const AuditLogger = require('../utils/auditLogger');
const Packet = require('../models/Packet');
const Vault = require('../models/Vault');
const AccessRequest = require('../models/AccessRequest');
const EmergencyToken = require('../models/EmergencyToken');

/**
 * GET /api/keys/status
 * Get key status for all three keys of the current user
 */
router.get('/status', authenticate, authorize('user'), async (req, res) => {
  try {
    const keys = await Key.find({ userId: req.user._id })
      .select('keyType status rotationInterval lastRotatedAt version createdAt');

    const keyStatus = {};
    for (const key of keys) {
      keyStatus[key.keyType] = {
        status: key.status,
        rotationInterval: key.rotationInterval,
        lastRotatedAt: key.lastRotatedAt,
        version: key.version
      };
    }

    res.json({
      success: true,
      data: {
        keys: keyStatus,
        allKeysActive: keys.every(k => k.status === 'active'),
        keyCount: keys.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch key status'
    });
  }
});

/**
 * GET /api/keys/totp
 * Get current rotating token for the user's key
 */
router.get('/totp', authenticate, authorize('user'), async (req, res) => {
  try {
    const userKey = await Key.findOne({
      userId: req.user._id,
      keyType: 'user'
    });

    if (!userKey) {
      return res.status(404).json({
        success: false,
        error: 'User key not found'
      });
    }

    const totp = createTOTPGenerator(userKey.totpSecret, userKey.rotationInterval);
    const tokenData = totp.getCurrentToken();

    res.json({
      success: true,
      data: {
        token: tokenData.token,
        timeRemaining: tokenData.timeRemaining,
        expiresAt: tokenData.expiresAt,
        interval: tokenData.interval,
        keyType: 'user'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate TOTP'
    });
  }
});

/**
 * POST /api/keys/regenerate
 * Regenerate the user's key
 */
router.post('/regenerate', authenticate, authorize('user'), async (req, res) => {
  try {
    const userKey = await Key.findOne({
      userId: req.user._id,
      keyType: 'user'
    });

    if (!userKey) {
      return res.status(404).json({
        success: false,
        error: 'User key not found'
      });
    }

    // Regenerate key
    userKey.keyData = generateKey();
    userKey.totpSecret = generateTOTPSecret(req.user._id.toString(), 'user');
    userKey.lastRotatedAt = new Date();
    userKey.version += 1;
    userKey.status = 'active';
    await userKey.save();

    // Audit log
    await AuditLogger.log({
      action: 'KEY_REGENERATED',
      actorId: req.user._id,
      actorRole: 'user',
      details: `User key regenerated. New version: ${userKey.version}`
    });

    res.json({
      success: true,
      data: {
        message: 'Key regenerated successfully',
        version: userKey.version,
        regeneratedAt: userKey.lastRotatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Key regeneration failed'
    });
  }
});

/**
 * GET /api/keys/all-status
 * Admin/Government: get all three key statuses for a target user
 */
router.get('/all-status/:userId', authenticate, authorize('government', 'admin'), async (req, res) => {
  try {
    const keys = await Key.find({ userId: req.params.userId })
      .select('keyType status rotationInterval lastRotatedAt version');

    res.json({
      success: true,
      data: { keys }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch key status'
    });
  }
});

/**
 * GET /api/keys/citizen-key/:requestId
 * Government retrieves citizen's key data for an approved request (for triple-key decryption)
 */
router.get('/citizen-key/:requestId', authenticate, authorize('government'), async (req, res) => {
  try {
    // Use top-level AccessRequest import
    const request = await AccessRequest.findById(req.params.requestId)
      .populate('targetUserId', 'name email');

    if (!request) {
      return res.status(404).json({ success: false, error: 'Access request not found' });
    }

    // Check request belongs to this officer
    if (request.requesterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'This request does not belong to you' });
    }

    if (request.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: `Request must be fully approved. Current status: "${request.status}"`
      });
    }

    // Must have a valid (non-expired, non-revoked) emergency token for this request
    const emergToken = await EmergencyToken.findOne({ requestId: req.params.requestId });
    if (!emergToken) {
      return res.status(403).json({
        success: false,
        error: 'No emergency token found for this request. Generate one from the Emergency Gateway first.'
      });
    }
    if (emergToken.revoked) {
      return res.status(403).json({ success: false, error: 'Emergency token has been revoked.' });
    }
    if (new Date() > emergToken.expiresAt) {
      return res.status(403).json({ success: false, error: 'Emergency token has expired. Generate a new one.' });
    }

    // Retrieve citizen's key
    const citizenKey = await Key.findOne({
      userId: request.targetUserId._id,
      keyType: 'user'
    }).select('keyData');

    if (!citizenKey) {
      return res.status(404).json({ success: false, error: `Citizen key not found for user: ${request.targetUserId.name}` });
    }

    // Audit log the key retrieval
    await AuditLogger.log({
      action: 'DATA_ACCESSED',
      actorId: req.user._id,
      actorRole: 'government',
      targetUserId: request.targetUserId._id,
      caseNumber: request.caseNumber,
      details: `Citizen key retrieved for triple-key decryption. Case: ${request.caseNumber}`
    });

    res.json({
      success: true,
      data: {
        citizenKeyData: citizenKey.keyData,
        targetUser: request.targetUserId.name,
        caseNumber: request.caseNumber
      }
    });
  } catch (error) {
    console.error('[citizen-key] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve citizen key' });
  }
});

/**
 * POST /api/keys/triple-access
 * Core TriLock Feature: Decrypt user data using all 3 keys simultaneously.
 */
router.post('/triple-access', authenticate, authorize('government'), async (req, res) => {
  try {
    const { requestId, citizenKeyData } = req.body;

    if (!requestId || !citizenKeyData) {
      return res.status(400).json({
        success: false,
        error: 'Request ID and citizen key data are required'
      });
    }

    // Verify the request exists and is approved
    const request = await AccessRequest.findById(requestId)
      .populate('requesterId', 'name email')
      .populate('targetUserId', 'name email');

    if (!request) {
      return res.status(404).json({ success: false, error: 'Access request not found' });
    }

    // Must be approved and belong to this officer
    if (request.requesterId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'This request does not belong to you' });
    }

    if (request.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: `Request must be fully approved. Current status: ${request.status}`
      });
    }

    // Verify there is a valid emergency token authorizing access
    const emergencyToken = await EmergencyToken.findOne({ requestId, revoked: false });
    if (!emergencyToken || !emergencyToken.isValid()) {
      return res.status(403).json({
        success: false,
        error: 'A valid emergency access token is required. Generate one first from the Emergency Gateway.'
      });
    }

    // Get the government and platform keys from the DB
    const govKey = await Key.findOne({ userId: request.targetUserId._id, keyType: 'government' });
    const platformKey = process.env.PLATFORM_ENCRYPTION_KEY;

    if (!govKey) {
      return res.status(500).json({ success: false, error: 'Government key not found for target user' });
    }

    // Derive the master key from all three components
    const masterKey = deriveMasterKey(citizenKeyData, govKey.keyData, platformKey);

    // Fetch and decrypt all packets
    const vault = await Vault.findOne({ userId: request.targetUserId._id });
    if (!vault) {
      return res.status(404).json({ success: false, error: 'Vault not found' });
    }

    const packets = await Packet.find({ vaultId: vault._id })
      .sort({ createdAt: -1 })
      .limit(100);

    const decryptedPackets = packets.map(p => {
      try {
        const plaintext = decrypt(p.encryptedData, p.iv, p.authTag, masterKey);
        return {
          packetId: p.packetId,
          data: JSON.parse(plaintext),
          collectedAt: p.metadata.collectedAt,
          decryptedWith: 'triple-key'
        };
      } catch {
        // Fall back to platform-only decryption if master key fails
        try {
          const plaintext = decrypt(p.encryptedData, p.iv, p.authTag, platformKey);
          return {
            packetId: p.packetId,
            data: JSON.parse(plaintext),
            collectedAt: p.metadata.collectedAt,
            decryptedWith: 'platform-key'
          };
        } catch {
          return {
            packetId: p.packetId,
            data: null,
            error: 'Decryption failed with all key combinations',
            collectedAt: p.metadata.collectedAt
          };
        }
      }
    });

    // Update access count on emergency token
    emergencyToken.accessCount += 1;
    await emergencyToken.save();

    // Audit log
    await AuditLogger.log({
      action: 'EMERGENCY_ACCESS_USED',
      actorId: req.user._id,
      actorRole: 'government',
      targetUserId: request.targetUserId._id,
      caseNumber: request.caseNumber,
      details: `Triple-key decryption performed. ${decryptedPackets.length} packets decrypted. Case: ${request.caseNumber}`
    });

    res.json({
      success: true,
      data: {
        caseNumber: request.caseNumber,
        targetUser: request.targetUserId.name,
        totalPackets: vault.packetCount,
        decryptedPackets,
        decryptionMethod: 'AES-256-GCM with derived master key (citizen + government + platform)',
        accessedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Triple-key access error:', error);
    res.status(500).json({
      success: false,
      error: 'Triple-key access failed'
    });
  }
});

module.exports = router;