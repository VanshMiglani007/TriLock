const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'USER_REGISTERED',
      'USER_LOGIN',
      'VAULT_CREATED',
      'PACKET_COLLECTED',
      'PACKET_ENCRYPTED',
      'KEY_GENERATED',
      'KEY_REGENERATED',
      'KEY_ROTATED',
      'ACCESS_REQUESTED',
      'COURT_ORDER_UPLOADED',
      'REVIEW_SUBMITTED',
      'REQUEST_APPROVED',
      'REQUEST_REJECTED',
      'EMERGENCY_TOKEN_GENERATED',
      'EMERGENCY_ACCESS_USED',
      'EMERGENCY_TOKEN_REVOKED',
      'EMERGENCY_TOKEN_EXPIRED',
      'DATA_ACCESSED',
      'INTEGRITY_CHECK_PASSED',
      'INTEGRITY_CHECK_FAILED',
      'TAMPER_DETECTED',
      'SYSTEM_CONFIG_CHANGED'
    ]
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  actorRole: {
    type: String,
    enum: ['user', 'government', 'verifier', 'admin', 'system']
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  caseNumber: {
    type: String
  },
  details: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  // Hash chain for immutability
  hash: {
    type: String,
    required: true
  },
  previousHash: {
    type: String,
    default: 'GENESIS'
  },
  sequenceNumber: {
    type: Number,
    required: true
  },
  // Explicit timestamp stored with the log entry — used in hash computation
  // This ensures verification always uses the same value as creation
  loggedAt: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Prevent updates - append only
auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs are immutable and cannot be modified');
});

auditLogSchema.pre('updateOne', function() {
  throw new Error('Audit logs are immutable and cannot be modified');
});

// Index for efficient querying
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ targetUserId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ sequenceNumber: 1 }, { unique: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
