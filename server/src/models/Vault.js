const mongoose = require('mongoose');

const vaultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'locked', 'compromised'],
    default: 'active'
  },
  encryptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'rotating'],
    default: 'active'
  },
  packetCount: {
    type: Number,
    default: 0
  },
  lastPacketAt: {
    type: Date
  },
  integrityHash: {
    type: String
  },
  integrityVerified: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Vault', vaultSchema);
