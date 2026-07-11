const mongoose = require('mongoose');

const keySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  keyType: {
    type: String,
    enum: ['user', 'government', 'platform'],
    required: true
  },
  // Encrypted key data
  keyData: {
    type: String,
    required: true
  },
  // TOTP secret for rotating tokens
  totpSecret: {
    type: String,
    required: true
  },
  // Current rotation status
  rotationInterval: {
    type: Number,
    default: 30 // seconds
  },
  lastRotatedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'revoked', 'regenerating'],
    default: 'active'
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Compound index: one key per type per user
keySchema.index({ userId: 1, keyType: 1 }, { unique: true });

module.exports = mongoose.model('Key', keySchema);
