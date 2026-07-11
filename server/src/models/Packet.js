const mongoose = require('mongoose');

const packetSchema = new mongoose.Schema({
  packetId: {
    type: String,
    required: true,
    unique: true
  },
  vaultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vault',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Encrypted location data (AES-256-GCM)
  encryptedData: {
    type: String,
    required: true
  },
  // Initialization vector for AES decryption
  iv: {
    type: String,
    required: true
  },
  // Authentication tag for GCM mode
  authTag: {
    type: String,
    required: true
  },
  // SHA-256 hash of original plaintext for tamper detection
  hash: {
    type: String,
    required: true
  },
  // Metadata (not encrypted - for display purposes)
  metadata: {
    collectedAt: {
      type: Date,
      required: true
    },
    packetSize: {
      type: Number
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying
packetSchema.index({ userId: 1, createdAt: -1 });
packetSchema.index({ vaultId: 1 });

module.exports = mongoose.model('Packet', packetSchema);
