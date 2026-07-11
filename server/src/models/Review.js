const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccessRequest',
    required: true
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewerRole: {
    type: String,
    enum: ['reviewer_a', 'reviewer_b'],
    required: true
  },
  decision: {
    type: String,
    enum: ['approved', 'rejected'],
    required: true
  },
  comments: {
    type: String,
    trim: true
  },
  verificationChecks: {
    courtOrderAuthenticity: { type: Boolean, default: false },
    caseDetailsVerified: { type: Boolean, default: false },
    officerIdentityVerified: { type: Boolean, default: false },
    targetPersonConfirmed: { type: Boolean, default: false }
  },
  hash: {
    type: String
  }
}, {
  timestamps: true
});

// One review per reviewer per request
reviewSchema.index({ requestId: 1, reviewerId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
