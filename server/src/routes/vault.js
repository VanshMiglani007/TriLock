const express = require('express');
const router = express.Router();
const Vault = require('../models/Vault');
const Packet = require('../models/Packet');
const { authenticate, authorize } = require('../middleware/auth');
const { generateHash } = require('../utils/hashing');

/**
 * GET /api/vault
 * Get user's vault status
 */
router.get('/', authenticate, authorize('user'), async (req, res) => {
  try {
    let vault = await Vault.findOne({ userId: req.user._id });

    if (!vault) {
      vault = await Vault.create({ userId: req.user._id });
    }

    res.json({
      success: true,
      data: {
        vault: {
          id: vault._id,
          status: vault.status,
          encryptionStatus: vault.encryptionStatus,
          packetCount: vault.packetCount,
          lastPacketAt: vault.lastPacketAt,
          integrityVerified: vault.integrityVerified,
          createdAt: vault.createdAt
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vault status'
    });
  }
});

/**
 * GET /api/vault/packets
 * Get encrypted packet list (metadata only, not decrypted)
 */
router.get('/packets', authenticate, authorize('user'), async (req, res) => {
  try {
    const vault = await Vault.findOne({ userId: req.user._id });
    if (!vault) {
      return res.status(404).json({
        success: false,
        error: 'Vault not found'
      });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const packets = await Packet.find({ vaultId: vault._id })
      .select('packetId metadata hash createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Packet.countDocuments({ vaultId: vault._id });

    res.json({
      success: true,
      data: {
        packets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch packets'
    });
  }
});

/**
 * GET /api/vault/integrity
 * Verify vault data integrity
 */
router.get('/integrity', authenticate, authorize('user'), async (req, res) => {
  try {
    const vault = await Vault.findOne({ userId: req.user._id });
    if (!vault) {
      return res.status(404).json({ success: false, error: 'Vault not found' });
    }

    const packets = await Packet.find({ vaultId: vault._id }).lean();
    let integrityValid = true;
    const issues = [];

    for (const packet of packets) {
      // Verify each packet's hash matches its encrypted content
      const contentHash = generateHash(packet.encryptedData + packet.iv + packet.authTag);
      if (contentHash !== packet.hash) {
        integrityValid = false;
        issues.push({
          packetId: packet.packetId,
          issue: 'Hash mismatch - possible tampering detected'
        });
      }
    }

    // Update vault integrity status
    vault.integrityVerified = integrityValid;
    await vault.save();

    res.json({
      success: true,
      data: {
        integrityValid,
        totalPackets: packets.length,
        issueCount: issues.length,
        issues: issues.slice(0, 10) // Limit to first 10 issues
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Integrity check failed'
    });
  }
});

module.exports = router;
