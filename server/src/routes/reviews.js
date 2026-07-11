const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const AccessRequest = require('../models/AccessRequest');
const { authenticate, authorize } = require('../middleware/auth');
const { generateHash } = require('../utils/hashing');
const AuditLogger = require('../utils/auditLogger');

/**
 * POST /api/reviews
 * Reviewer submits a decision on an access request
 * Implements dual-reviewer verification
 */
router.post('/', authenticate, authorize('verifier'), async (req, res) => {
  try {
    const { requestId, decision, comments, verificationChecks } = req.body;

    if (!requestId || !decision) {
      return res.status(400).json({
        success: false,
        error: 'Request ID and decision are required'
      });
    }

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'Decision must be "approved" or "rejected"'
      });
    }

    // Get the request
    const request = await AccessRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Access request not found'
      });
    }

    // Only allow reviewing requests that have documents uploaded and are in review
    const REVIEWABLE_STATUSES = ['documents_uploaded', 'under_review', 'reviewer_a_approved'];
    if (!REVIEWABLE_STATUSES.includes(request.status)) {
      return res.status(400).json({
        success: false,
        error: `Request cannot be reviewed at this stage. Current status: ${request.status}`
      });
    }

    // Check if this reviewer already reviewed
    const existingReview = await Review.findOne({
      requestId,
      reviewerId: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: 'You have already reviewed this request'
      });
    }

    // Determine reviewer role (A or B)
    const existingReviews = await Review.find({ requestId });
    const reviewerRole = existingReviews.length === 0 ? 'reviewer_a' : 'reviewer_b';

    if (existingReviews.length >= 2) {
      return res.status(400).json({
        success: false,
        error: 'This request has already been fully reviewed'
      });
    }

    // Create review hash
    const reviewData = {
      requestId: requestId.toString(),
      reviewerId: req.user._id.toString(),
      decision,
      reviewerRole
    };
    const hash = generateHash(reviewData);

    // Create the review
    const review = await Review.create({
      requestId,
      reviewerId: req.user._id,
      reviewerRole,
      decision,
      comments: comments || '',
      verificationChecks: verificationChecks || {},
      hash
    });

    // Update request status based on dual review logic
    if (decision === 'rejected') {
      request.status = 'rejected';
      if (reviewerRole === 'reviewer_a') {
        request.reviewerA = req.user._id;
      } else {
        request.reviewerB = req.user._id;
      }
      await request.save();

      await AuditLogger.log({
        action: 'REQUEST_REJECTED',
        actorId: req.user._id,
        actorRole: 'verifier',
        targetUserId: request.targetUserId,
        caseNumber: request.caseNumber,
        details: `Request rejected by ${reviewerRole}. Comments: ${comments || 'None'}`
      });
    } else {
      // Approved
      if (reviewerRole === 'reviewer_a') {
        request.status = 'reviewer_a_approved';
        request.reviewerA = req.user._id;
        await request.save();

        await AuditLogger.log({
          action: 'REVIEW_SUBMITTED',
          actorId: req.user._id,
          actorRole: 'verifier',
          targetUserId: request.targetUserId,
          caseNumber: request.caseNumber,
          details: `Reviewer A approved. Awaiting Reviewer B.`
        });
      } else {
        // Reviewer B — check if Reviewer A also approved
        const reviewerAReview = existingReviews.find(r => r.reviewerRole === 'reviewer_a');
        if (reviewerAReview && reviewerAReview.decision === 'approved') {
          request.status = 'approved';
        } else {
          // Reviewer A had rejected — dual review means rejection takes precedence
          request.status = 'rejected';
        }
        request.reviewerB = req.user._id;
        await request.save();

        await AuditLogger.log({
          action: request.status === 'approved' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
          actorId: req.user._id,
          actorRole: 'verifier',
          targetUserId: request.targetUserId,
          caseNumber: request.caseNumber,
          details: request.status === 'approved'
            ? `Request fully approved by dual review. Ready for emergency token generation.`
            : `Request rejected at Reviewer B stage. Reviewer A had rejected.`
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        review: {
          id: review._id,
          reviewerRole: review.reviewerRole,
          decision: review.decision,
          requestStatus: request.status
        }
      }
    });
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit review'
    });
  }
});

/**
 * GET /api/reviews/:requestId
 * Get all reviews for a request
 */
router.get('/:requestId', authenticate, authorize('verifier', 'admin', 'government'), async (req, res) => {
  try {
    const reviews = await Review.find({ requestId: req.params.requestId })
      .populate('reviewerId', 'name email')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: { reviews }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews'
    });
  }
});

module.exports = router;
