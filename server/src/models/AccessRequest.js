const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caseNumber: {
    type: String,
    required: [true, 'Case number is required'],
    trim: true
  },
  reason: {
    type: String,
    required: [true, 'Reason for access is required'],
    minlength: 10
  },
  investigationDetails: {
    type: String,
    required: [true, 'Investigation details are required'],
    minlength: 20
  },
  status: {
    type: String,
    enum: [
      'pending',
      'documents_uploaded',
      'under_review',
      'reviewer_a_approved',
      'reviewer_b_approved',
      'approved',
      'rejected',
      'expired',
      'revoked'
    ],
    default: 'pending'
  },
  scope: {
    locationData: { type: Boolean, default: true },
    communicationMetadata: { type: Boolean, default: false }
  },
  duration: {
    type: Number,
    enum: [24, 48, 72],
    default: 24,
    // Duration in hours
  },
  proofDocuments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourtOrder'
  }],
  reviewerA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewerB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  emergencyToken: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyToken'
  },
  hash: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient querying
accessRequestSchema.index({ status: 1 });
accessRequestSchema.index({ requesterId: 1 });
accessRequestSchema.index({ targetUserId: 1 });

module.exports = mongoose.model('AccessRequest', accessRequestSchema);
