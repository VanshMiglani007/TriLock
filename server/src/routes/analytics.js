const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Vault = require('../models/Vault');
const Packet = require('../models/Packet');
const AccessRequest = require('../models/AccessRequest');
const EmergencyToken = require('../models/EmergencyToken');
const AuditLog = require('../models/AuditLog');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/analytics/privacy-score
 * Calculate the privacy score based on system state
 */
router.get('/privacy-score', authenticate, async (req, res) => {
  try {
    let score = 100;
    const factors = [];

    // Factor 1: Active emergency access tokens reduce privacy
    const activeTokens = await EmergencyToken.countDocuments({
      revoked: false,
      expiresAt: { $gt: new Date() }
    });
    const tokenPenalty = Math.min(activeTokens * 5, 25);
    score -= tokenPenalty;
    factors.push({
      name: 'Active Emergency Tokens',
      count: activeTokens,
      impact: -tokenPenalty,
      description: 'Each active emergency access reduces privacy'
    });

    // Factor 2: Pending access requests
    const pendingRequests = await AccessRequest.countDocuments({
      status: { $in: ['pending', 'documents_uploaded', 'under_review', 'reviewer_a_approved'] }
    });
    const requestPenalty = Math.min(pendingRequests * 2, 10);
    score -= requestPenalty;
    factors.push({
      name: 'Pending Access Requests',
      count: pendingRequests,
      impact: -requestPenalty,
      description: 'Open requests indicate active surveillance interest'
    });

    // Factor 3: Encryption status (bonus)
    const totalVaults = await Vault.countDocuments();
    const encryptedVaults = await Vault.countDocuments({ encryptionStatus: 'active' });
    const encryptionRatio = totalVaults > 0 ? encryptedVaults / totalVaults : 1;
    const encryptionBonus = Math.round(encryptionRatio * 5);
    factors.push({
      name: 'Encryption Coverage',
      count: `${encryptedVaults}/${totalVaults}`,
      impact: encryptionBonus,
      description: 'Percentage of vaults with active encryption'
    });

    // Factor 4: Recent data accesses
    const recentAccesses = await AuditLog.countDocuments({
      action: 'EMERGENCY_ACCESS_USED',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    const accessPenalty = Math.min(recentAccesses * 3, 15);
    score -= accessPenalty;
    factors.push({
      name: 'Recent Data Accesses (24h)',
      count: recentAccesses,
      impact: -accessPenalty,
      description: 'Recent emergency data accesses'
    });

    score = Math.max(0, Math.min(100, score));

    res.json({
      success: true,
      data: {
        privacyScore: score,
        factors,
        calculatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to calculate privacy score'
    });
  }
});

/**
 * GET /api/analytics/safety-score
 * Calculate the public safety score
 */
router.get('/safety-score', authenticate, async (req, res) => {
  try {
    let score = 50; // Base score
    const factors = [];

    // Factor 1: User participation (more users = better coverage)
    const totalUsers = await User.countDocuments({ role: 'user' });
    const participationBonus = Math.min(totalUsers * 2, 20);
    score += participationBonus;
    factors.push({
      name: 'User Participation',
      count: totalUsers,
      impact: participationBonus,
      description: 'More users contributing data improves public safety coverage'
    });

    // Factor 2: Active data collection
    const totalPackets = await Packet.countDocuments();
    const dataBonus = Math.min(Math.floor(totalPackets / 10), 15);
    score += dataBonus;
    factors.push({
      name: 'Data Collection Volume',
      count: totalPackets,
      impact: dataBonus,
      description: 'More location data available for authorized investigations'
    });

    // Factor 3: Successful investigations
    const approvedRequests = await AccessRequest.countDocuments({ status: 'approved' });
    const investigationBonus = Math.min(approvedRequests * 3, 15);
    score += investigationBonus;
    factors.push({
      name: 'Approved Investigations',
      count: approvedRequests,
      impact: investigationBonus,
      description: 'Successfully approved and verified investigations'
    });

    // Factor 4: Verification system health
    const totalReviews = await AccessRequest.countDocuments({
      status: { $in: ['approved', 'rejected'] }
    });
    const rejectedRequests = await AccessRequest.countDocuments({ status: 'rejected' });
    const verificationHealth = totalReviews > 0
      ? Math.round(((totalReviews - rejectedRequests) / totalReviews) * 10)
      : 5;
    score += verificationHealth;
    factors.push({
      name: 'Verification System Health',
      count: `${totalReviews} reviewed`,
      impact: verificationHealth,
      description: 'Health of the verification pipeline'
    });

    score = Math.max(0, Math.min(100, score));

    res.json({
      success: true,
      data: {
        safetyScore: score,
        factors,
        calculatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to calculate safety score'
    });
  }
});

/**
 * GET /api/analytics/dashboard
 * Combined analytics dashboard data
 */
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [
      totalUsers,
      totalVaults,
      totalPackets,
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      activeTokens,
      totalAuditLogs
    ] = await Promise.all([
      User.countDocuments(),
      Vault.countDocuments(),
      Packet.countDocuments(),
      AccessRequest.countDocuments(),
      AccessRequest.countDocuments({ status: { $in: ['pending', 'documents_uploaded', 'under_review'] } }),
      AccessRequest.countDocuments({ status: 'approved' }),
      AccessRequest.countDocuments({ status: 'rejected' }),
      EmergencyToken.countDocuments({ revoked: false, expiresAt: { $gt: new Date() } }),
      AuditLog.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalVaults,
          totalPackets,
          totalRequests,
          pendingRequests,
          approvedRequests,
          rejectedRequests,
          activeTokens,
          totalAuditLogs
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

module.exports = router;
