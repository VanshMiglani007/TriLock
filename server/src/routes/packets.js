const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Packet = require('../models/Packet');
const Vault = require('../models/Vault');
const { authenticate, authorize } = require('../middleware/auth');
const { encryptPacket } = require('../utils/encryption');
const { generateHash } = require('../utils/hashing');
const AuditLogger = require('../utils/auditLogger');

/**
 * Shared helper: encrypt, hash, and store a single location packet.
 * Used by both /collect and /batch to avoid duplicating the pipeline.
 *
 * @param {{ latitude: number, longitude: number, timestamp?: string }} rawData
 * @param {string} userId - Owner's user ID
 * @param {object} vault  - Mongoose Vault document (packetCount is incremented)
 * @returns {{ packetId: string, hash: string, collectedAt: Date }}
 */
async function createEncryptedPacket(rawData, userId, vault) {
  const packetData = {
    latitude: parseFloat(rawData.latitude),
    longitude: parseFloat(rawData.longitude),
    timestamp: rawData.timestamp || new Date().toISOString()
  };

  const packetId = `PKT-${uuidv4().split('-')[0].toUpperCase()}`;
  const platformKey = process.env.PLATFORM_ENCRYPTION_KEY;
  const { encryptedData, iv, authTag } = encryptPacket(packetData, platformKey);
  const hash = generateHash(encryptedData + iv + authTag);

  const packet = await Packet.create({
    packetId,
    vaultId: vault._id,
    userId,
    encryptedData,
    iv,
    authTag,
    hash,
    metadata: {
      collectedAt: new Date(packetData.timestamp),
      packetSize: Buffer.byteLength(encryptedData, 'utf8')
    }
  });

  vault.packetCount += 1;

  return {
    packetId: packet.packetId,
    hash: packet.hash,
    collectedAt: packet.metadata.collectedAt
  };
}

/**
 * POST /api/packets/collect
 * Collect, encrypt, and store a location packet
 */
router.post('/collect', authenticate, authorize('user'), async (req, res) => {
  try {
    const { latitude, longitude, timestamp } = req.body;

    // Validate location data
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        error: 'Latitude must be between -90 and 90'
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Longitude must be between -180 and 180'
      });
    }

    // Get or create vault
    let vault = await Vault.findOne({ userId: req.user._id });
    if (!vault) {
      vault = await Vault.create({ userId: req.user._id });
    }

    const result = await createEncryptedPacket(
      { latitude, longitude, timestamp },
      req.user._id,
      vault
    );

    // Update vault timestamp and save
    vault.lastPacketAt = new Date();
    await vault.save();

    // Audit log
    await AuditLogger.log({
      action: 'PACKET_COLLECTED',
      actorId: req.user._id,
      actorRole: 'user',
      details: `Location packet ${result.packetId} collected and encrypted`,
      metadata: { packetId: result.packetId, vaultId: vault._id.toString() }
    });

    res.status(201).json({
      success: true,
      data: {
        packetId: result.packetId,
        encrypted: true,
        hash: result.hash,
        collectedAt: result.collectedAt,
        vaultPacketCount: vault.packetCount
      }
    });
  } catch (error) {
    console.error('Packet collection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect and encrypt packet'
    });
  }
});

/**
 * GET /api/packets/count
 * Get packet count for the current user
 */
router.get('/count', authenticate, authorize('user'), async (req, res) => {
  try {
    const vault = await Vault.findOne({ userId: req.user._id });
    const count = vault ? vault.packetCount : 0;

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get packet count'
    });
  }
});

/**
 * POST /api/packets/batch
 * Collect multiple location packets at once
 */
router.post('/batch', authenticate, authorize('user'), async (req, res) => {
  try {
    const { packets: packetList } = req.body;

    if (!Array.isArray(packetList) || packetList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'An array of packets is required'
      });
    }

    if (packetList.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 packets per batch'
      });
    }

    let vault = await Vault.findOne({ userId: req.user._id });
    if (!vault) {
      vault = await Vault.create({ userId: req.user._id });
    }

    const results = [];

    for (const pkt of packetList) {
      const result = await createEncryptedPacket(pkt, req.user._id, vault);
      results.push({ packetId: result.packetId, encrypted: true });
    }

    vault.lastPacketAt = new Date();
    await vault.save();

    res.status(201).json({
      success: true,
      data: {
        batchSize: results.length,
        packets: results,
        vaultPacketCount: vault.packetCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Batch collection failed'
    });
  }
});

module.exports = router;
