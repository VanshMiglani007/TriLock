const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const EmergencyToken = require('../models/EmergencyToken');
const AccessRequest = require('../models/AccessRequest');
const Packet = require('../models/Packet');
const Vault = require('../models/Vault');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { decrypt } = require('../utils/encryption');
const { generateHash } = require('../utils/hashing');
const AuditLogger = require('../utils/auditLogger');
const { notifyCitizenVoiceCall } = require('../utils/voiceNotify');


/**
 * GET /api/emergency/my-tokens
 * Returns all emergency tokens issued to the current officer (active + expired)
 */
router.get('/my-tokens', authenticate, authorize('government'), async (req, res) => {
  try {
    const tokens = await EmergencyToken.find({ issuedTo: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      data: {
        tokens: tokens.map(t => ({
          id: t._id,
          token: t.token,
          requestId: t.requestId,
          caseNumber: t.caseNumber,
          expiresAt: t.expiresAt,
          revoked: t.revoked,
          accessCount: t.accessCount,
          isValid: t.isValid(),
          duration: 'N/A'
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch tokens' });
  }
});


/**
 * POST /api/emergency/token
 * Generate an emergency access token after dual-review approval
 */
router.post('/token', authenticate, authorize('admin', 'verifier', 'government'), async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'Request ID is required'
      });
    }

    const request = await AccessRequest.findById(requestId)
      .populate('requesterId', 'name email')
      .populate('targetUserId', 'name email');

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Access request not found'
      });
    }

    if (request.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: `Request must be fully approved. Current status: ${request.status}`
      });
    }

    // Check if token already exists
    const existingToken = await EmergencyToken.findOne({ requestId, revoked: false });
    if (existingToken && existingToken.isValid()) {
      return res.status(400).json({
        success: false,
        error: 'An active emergency token already exists for this request'
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + request.duration * 60 * 60 * 1000);

    const emergencyToken = await EmergencyToken.create({
      requestId,
      token,
      issuedTo: request.requesterId._id,
      targetUserId: request.targetUserId._id,
      scope: request.scope,
      caseNumber: request.caseNumber,
      expiresAt,
      hash: generateHash({ token, requestId: requestId.toString(), expiresAt: expiresAt.toISOString() })
    });

    // Update request with token reference
    request.emergencyToken = emergencyToken._id;
    await request.save();

    // Audit log
    await AuditLogger.log({
      action: 'EMERGENCY_TOKEN_GENERATED',
      actorId: req.user._id,
      actorRole: req.user.role,
      targetUserId: request.targetUserId._id,
      caseNumber: request.caseNumber,
      details: `Emergency access token generated. Expires: ${expiresAt.toISOString()}. Duration: ${request.duration}h`
    });

    res.status(201).json({
      success: true,
      data: {
        emergencyToken: {
          id: emergencyToken._id,
          token: emergencyToken.token,
          caseNumber: emergencyToken.caseNumber,
          scope: emergencyToken.scope,
          expiresAt: emergencyToken.expiresAt,
          duration: request.duration + ' hours'
        }
      }
    });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate emergency token'
    });
  }
});

/**
 * GET /api/emergency/access/:token
 * Access user data using an emergency token (limited scope, time-bound)
 */
router.get('/access/:token', authenticate, authorize('government'), async (req, res) => {
  try {
    const emergencyToken = await EmergencyToken.findOne({ token: req.params.token })
      .populate('targetUserId', 'name email');

    if (!emergencyToken) {
      return res.status(404).json({
        success: false,
        error: 'Emergency token not found'
      });
    }

    // Verify token is valid
    if (!emergencyToken.isValid()) {
      const reason = emergencyToken.revoked ? 'Token has been revoked' : 'Token has expired';
      return res.status(403).json({
        success: false,
        error: reason
      });
    }

    // Verify the token was issued to the requesting officer
    if (emergencyToken.issuedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'This token was not issued to you'
      });
    }

    // Get limited scope data
    const data = {};

    if (emergencyToken.scope.locationData) {
      const vault = await Vault.findOne({ userId: emergencyToken.targetUserId._id });
      if (vault) {
        const packets = await Packet.find({ vaultId: vault._id })
          .sort({ createdAt: -1 })
          .limit(100);

        // Decrypt packets with platform key
        const platformKey = process.env.PLATFORM_ENCRYPTION_KEY;
        const decryptedPackets = packets.map(p => {
          try {
            const decrypted = decrypt(p.encryptedData, p.iv, p.authTag, platformKey);
            return {
              packetId: p.packetId,
              data: JSON.parse(decrypted),
              collectedAt: p.metadata.collectedAt
            };
          } catch {
            return {
              packetId: p.packetId,
              data: null,
              error: 'Decryption failed',
              collectedAt: p.metadata.collectedAt
            };
          }
        });

        data.locationPackets = decryptedPackets;
        data.totalPackets = vault.packetCount;
      }
    }

    // Update access count
    emergencyToken.accessCount += 1;
    await emergencyToken.save();

    // Audit log
    await AuditLogger.log({
      action: 'EMERGENCY_ACCESS_USED',
      actorId: req.user._id,
      actorRole: 'government',
      targetUserId: emergencyToken.targetUserId._id,
      caseNumber: emergencyToken.caseNumber,
      details: `Emergency access used. Access count: ${emergencyToken.accessCount}. Scope: ${Object.keys(emergencyToken.scope).filter(k => emergencyToken.scope[k]).join(', ')}`
    });

    // === AI Voice Notification ===
    // Non-blocking — errors never fail the response.
    (async () => {
      try {
        const citizen = await User.findById(emergencyToken.targetUserId._id).select('phoneNumber name');
        const officer = await User.findById(req.user._id).select('name department');
        if (citizen && citizen.phoneNumber) {
          await notifyCitizenVoiceCall({
            phoneNumber: citizen.phoneNumber,
            citizenName: citizen.name,
            caseNumber: emergencyToken.caseNumber,
            officerName: officer ? officer.name : 'Law Enforcement Officer',
            department: officer ? officer.department : '',
            duration: emergencyToken.duration || 24
          });
        } else {
          console.log(`[TriLock VoiceAI] No phone number for citizen ${emergencyToken.targetUserId._id} — skipping call`);
        }
      } catch (voiceErr) {
        console.error('[TriLock VoiceAI] Background call error:', voiceErr.message);
      }
    })();

    res.json({
      success: true,
      data: {
        caseNumber: emergencyToken.caseNumber,
        targetUser: emergencyToken.targetUserId.name,
        scope: emergencyToken.scope,
        expiresAt: emergencyToken.expiresAt,
        accessCount: emergencyToken.accessCount,
        ...data
      }
    });
  } catch (error) {
    console.error('Emergency access error:', error);
    res.status(500).json({
      success: false,
      error: 'Emergency access failed'
    });
  }
});

/**
 * POST /api/emergency/revoke/:token
 * Revoke an emergency access token
 */
router.post('/revoke/:token', authenticate, authorize('admin', 'verifier'), async (req, res) => {
  try {
    const emergencyToken = await EmergencyToken.findOne({ token: req.params.token });

    if (!emergencyToken) {
      return res.status(404).json({
        success: false,
        error: 'Emergency token not found'
      });
    }

    emergencyToken.revoked = true;
    emergencyToken.revokedAt = new Date();
    await emergencyToken.save();

    // Update request status
    await AccessRequest.findByIdAndUpdate(emergencyToken.requestId, {
      status: 'revoked'
    });

    // Audit log
    await AuditLogger.log({
      action: 'EMERGENCY_TOKEN_REVOKED',
      actorId: req.user._id,
      actorRole: req.user.role,
      targetUserId: emergencyToken.targetUserId,
      caseNumber: emergencyToken.caseNumber,
      details: `Emergency token revoked. Total accesses before revocation: ${emergencyToken.accessCount}`
    });

    res.json({
      success: true,
      data: {
        message: 'Emergency token revoked successfully',
        revokedAt: emergencyToken.revokedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to revoke token'
    });
  }
});

module.exports = router;
