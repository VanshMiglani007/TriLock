const mongoose = require('mongoose');

const courtOrderSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccessRequest',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  storedFilename: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  // SHA-256 hash of the file for integrity verification
  fileHash: {
    type: String,
    required: true
  },
  documentType: {
    type: String,
    enum: ['court_order', 'judicial_authorization', 'emergency_declaration', 'investigation_request', 'other'],
    default: 'court_order'
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

courtOrderSchema.index({ requestId: 1 });

module.exports = mongoose.model('CourtOrder', courtOrderSchema);
