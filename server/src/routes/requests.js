const express = require('express');
const router = express.Router();
const AccessRequest = require('../models/AccessRequest');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { generateHash } = require('../utils/hashing');
const AuditLogger = require('../utils/auditLogger');

/**
 * POST /api/requests
 * Government creates a new access request
 */
router.post('/', authenticate, authorize('government'), async (req, res) => {
  try {
    const { targetUserEmail, caseNumber, reason, investigationDetails, scope, duration } = req.body;

    // Validate required fields
    if (!targetUserEmail || !caseNumber || !reason || !investigationDetails) {
      return res.status(400).json({
        success: false,
        error: 'Target user email, case number, reason, and investigation details are required'
      });
    }

    // Find target user
    const targetUser = await User.findOne({ email: targetUserEmail, role: 'user' });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'Target user not found'
      });
    }

    // Check for existing active request
    const existingRequest = await AccessRequest.findOne({
      requesterId: req.user._id,
      targetUserId: targetUser._id,
      status: { $in: ['pending', 'documents_uploaded', 'under_review', 'reviewer_a_approved'] }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: 'An active request for this user already exists',
        data: { existingRequestId: existingRequest._id }
      });
    }

    // Create request hash
    const requestData = { caseNumber, reason, investigationDetails, targetUserId: targetUser._id.toString() };
    const hash = generateHash(requestData);

    const request = await AccessRequest.create({
      requesterId: req.user._id,
      targetUserId: targetUser._id,
      caseNumber,
      reason,
      investigationDetails,
      scope: scope || { locationData: true, communicationMetadata: false },
      duration: duration || 24,
      hash
    });

    // Audit log
    await AuditLogger.log({
      action: 'ACCESS_REQUESTED',
      actorId: req.user._id,
      actorRole: 'government',
      targetUserId: targetUser._id,
      caseNumber,
      details: `Access request created for case ${caseNumber}. Target: ${targetUser.email}`
    });

    res.status(201).json({
      success: true,
      data: {
        request: {
          id: request._id,
          caseNumber: request.caseNumber,
          status: request.status,
          targetUser: targetUser.name,
          createdAt: request.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Request creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create access request'
    });
  }
});

/**
 * GET /api/requests
 * List access requests (filtered by role)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    let filter = {};

    // Role-based filtering
    switch (req.user.role) {
      case 'user':
        filter.targetUserId = req.user._id;
        break;
      case 'government':
        filter.requesterId = req.user._id;
        break;
      case 'verifier':
        // Verifiers see requests that need review
        filter.status = { $in: ['documents_uploaded', 'under_review', 'reviewer_a_approved'] };
        break;
      case 'admin':
        // Admin sees all requests
        break;
    }

    if (status && req.user.role !== 'verifier') {
      filter.status = status;
    }

    const requests = await AccessRequest.find(filter)
      .populate('requesterId', 'name email department')
      .populate('targetUserId', 'name email')
      .populate('proofDocuments')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit);

    const total = await AccessRequest.countDocuments(filter);

    res.json({
      success: true,
      data: {
        requests,
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
      error: 'Failed to fetch requests'
    });
  }
});

/**
 * GET /api/requests/:id
 * Get request details
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.id)
      .populate('requesterId', 'name email department badgeNumber')
      .populate('targetUserId', 'name email')
      .populate('proofDocuments')
      .populate('reviewerA', 'name email')
      .populate('reviewerB', 'name email')
      .populate('emergencyToken');

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }

    // Access control
    if (req.user.role === 'user' && request.targetUserId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (req.user.role === 'government' && request.requesterId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { request }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch request details'
    });
  }
});

/**
 * PATCH /api/requests/:id/status
 * Update request status
 */
router.patch('/:id/status', authenticate, authorize('verifier', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;

    // Whitelist: only these statuses can be set via this endpoint
    const ALLOWED_STATUSES = ['under_review', 'rejected'];
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`
      });
    }

    const request = await AccessRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }

    request.status = status;
    await request.save();

    res.json({
      success: true,
      data: { request }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update request status'
    });
  }
});

module.exports = router;
