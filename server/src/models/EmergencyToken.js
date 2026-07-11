const mongoose = require('mongoose');

const emergencyTokenSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccessRequest',
    required: true,
    unique: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  issuedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scope: {
    locationData: { type: Boolean, default: true },
    communicationMetadata: { type: Boolean, default: false }
  },
  caseNumber: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  revoked: {
    type: Boolean,
    default: false
  },
  revokedAt: {
    type: Date
  },
  accessCount: {
    type: Number,
    default: 0
  },
  hash: {
    type: String
  }
}, {
  timestamps: true
});

// Auto-check expiry
emergencyTokenSchema.methods.isValid = function() {
  return !this.revoked && new Date() < this.expiresAt;
};

module.exports = mongoose.model('EmergencyToken', emergencyTokenSchema);
