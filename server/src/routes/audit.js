const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const AuditLogger = require('../utils/auditLogger');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * GET /api/audit
 * Searchable audit logs
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { action, actorId, targetUserId, caseNumber, page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    let filter = {};

    // Role-based filtering
    if (req.user.role === 'user') {
      // Users can only see logs related to them
      filter.$or = [
        { actorId: req.user._id },
        { targetUserId: req.user._id }
      ];
    }

    // Apply search filters
    if (action) filter.action = action;
    if (actorId && req.user.role !== 'user') filter.actorId = actorId;
    if (targetUserId && req.user.role !== 'user') filter.targetUserId = targetUserId;
    if (caseNumber) filter.caseNumber = caseNumber;

    const logs = await AuditLog.find(filter)
      .populate('actorId', 'name email role')
      .populate('targetUserId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit);

    const total = await AuditLog.countDocuments(filter);

    res.json({
      success: true,
      data: {
        logs,
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
      error: 'Failed to fetch audit logs'
    });
  }
});

/**
 * GET /api/audit/verify
 * Verify audit log chain integrity
 */
router.get('/verify', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await AuditLogger.verifyChain();

    // Log the integrity check
    await AuditLogger.log({
      action: result.valid ? 'INTEGRITY_CHECK_PASSED' : 'INTEGRITY_CHECK_FAILED',
      actorId: req.user._id,
      actorRole: 'admin',
      details: result.valid
        ? `Audit chain integrity verified. ${result.totalEntries} entries checked.`
        : `Audit chain integrity FAILED at entry ${result.brokenAt}. Error: ${result.error}`
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Chain verification failed'
    });
  }
});

/**
 * GET /api/audit/actions
 * Get list of available audit actions
 */
router.get('/actions', authenticate, authorize('admin'), async (req, res) => {
  const actions = [
    'USER_REGISTERED', 'USER_LOGIN', 'VAULT_CREATED',
    'PACKET_COLLECTED', 'PACKET_ENCRYPTED', 'KEY_GENERATED',
    'KEY_REGENERATED', 'KEY_ROTATED', 'ACCESS_REQUESTED',
    'COURT_ORDER_UPLOADED', 'REVIEW_SUBMITTED', 'REQUEST_APPROVED',
    'REQUEST_REJECTED', 'EMERGENCY_TOKEN_GENERATED', 'EMERGENCY_ACCESS_USED',
    'EMERGENCY_TOKEN_REVOKED', 'EMERGENCY_TOKEN_EXPIRED', 'DATA_ACCESSED',
    'INTEGRITY_CHECK_PASSED', 'INTEGRITY_CHECK_FAILED', 'TAMPER_DETECTED',
    'SYSTEM_CONFIG_CHANGED'
  ];

  res.json({
    success: true,
    data: { actions }
  });
});

module.exports = router;
