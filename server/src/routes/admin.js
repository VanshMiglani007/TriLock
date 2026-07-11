const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Vault = require('../models/Vault');
const Packet = require('../models/Packet');
const Key = require('../models/Key');
const AccessRequest = require('../models/AccessRequest');
const EmergencyToken = require('../models/EmergencyToken');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const AuditLogger = require('../utils/auditLogger');

/**
 * GET /api/admin/users
 * Search users (government/admin)
 */
router.get('/users', authenticate, authorize('government', 'admin'), async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    let filter = {};
    if (search) {
      // V1: Escape regex special chars to prevent ReDoS / injection
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } }
      ];
    }
    if (role) {
      filter.role = role;
    }

    // Government can only search for regular users
    if (req.user.role === 'government') {
      filter.role = 'user';
    }

    const users = await User.find(filter)
      .select('name email role department isActive createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
});

/**
 * GET /api/admin/system-stats
 * System-wide statistics (admin only)
 */
router.get('/system-stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [
      usersByRole,
      totalVaults,
      totalPackets,
      activeVaults,
      requestsByStatus,
      activeTokens,
      expiredTokens,
      totalAuditLogs,
      recentLogs
    ] = await Promise.all([
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      Vault.countDocuments(),
      Packet.countDocuments(),
      Vault.countDocuments({ status: 'active' }),
      AccessRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      EmergencyToken.countDocuments({
        revoked: false,
        expiresAt: { $gt: new Date() }
      }),
      EmergencyToken.countDocuments({
        $or: [
          { revoked: true },
          { expiresAt: { $lte: new Date() } }
        ]
      }),
      AuditLog.countDocuments(),
      AuditLog.find()
        .populate('actorId', 'name role')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    // Format users by role
    const usersMap = {};
    usersByRole.forEach(r => { usersMap[r._id] = r.count; });

    // Format requests by status
    const requestsMap = {};
    requestsByStatus.forEach(r => { requestsMap[r._id] = r.count; });

    res.json({
      success: true,
      data: {
        users: usersMap,
        vaults: { total: totalVaults, active: activeVaults },
        packets: totalPackets,
        requests: requestsMap,
        tokens: { active: activeTokens, expired: expiredTokens },
        auditLogs: totalAuditLogs,
        recentActivity: recentLogs
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system stats'
    });
  }
});

/**
 * GET /api/admin/platform-key
 * Get platform key status (admin only)
 */
router.get('/platform-key', authenticate, authorize('admin'), async (req, res) => {
  try {
    const platformKeys = await Key.find({ keyType: 'platform' })
      .select('userId keyType status lastRotatedAt version')
      .populate('userId', 'name email');

    res.json({
      success: true,
      data: {
        platformKeys,
        totalPlatformKeys: platformKeys.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platform key status'
    });
  }
});

/**
 * GET /api/admin/all-vaults
 * Overview of all vaults (admin only)
 */
router.get('/all-vaults', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const vaults = await Vault.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit);

    const total = await Vault.countDocuments();

    res.json({
      success: true,
      data: {
        vaults,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vaults'
    });
  }
});

module.exports = router;
