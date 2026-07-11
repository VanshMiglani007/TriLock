const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CourtOrder = require('../models/CourtOrder');
const AccessRequest = require('../models/AccessRequest');
const { authenticate, authorize } = require('../middleware/auth');
const { hashFile } = require('../utils/hashing');
const AuditLogger = require('../utils/auditLogger');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'court-orders');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `court-order-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, JPEG, PNG, DOC, DOCX'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

/**
 * POST /api/upload/court-order
 * Upload a court order document
 */
router.post('/court-order', authenticate, authorize('government'), upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No document uploaded'
      });
    }

    const { requestId, documentType } = req.body;

    if (!requestId) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Request ID is required'
      });
    }

    // Verify request exists and belongs to this officer
    const request = await AccessRequest.findOne({
      _id: requestId,
      requesterId: req.user._id
    });

    if (!request) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        error: 'Access request not found or not owned by you'
      });
    }

    // Generate file hash for integrity
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = hashFile(fileBuffer);

    // Create court order record
    const courtOrder = await CourtOrder.create({
      requestId,
      uploadedBy: req.user._id,
      originalFilename: req.file.originalname,
      storedFilename: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      fileHash,
      documentType: documentType || 'court_order'
    });

    // Update request status and add proof document
    request.proofDocuments.push(courtOrder._id);
    if (request.status === 'pending') {
      request.status = 'documents_uploaded';
    }
    await request.save();

    // Audit log
    await AuditLogger.log({
      action: 'COURT_ORDER_UPLOADED',
      actorId: req.user._id,
      actorRole: 'government',
      targetUserId: request.targetUserId,
      caseNumber: request.caseNumber,
      details: `Court order uploaded: ${req.file.originalname}. Hash: ${fileHash.substring(0, 16)}...`
    });

    res.status(201).json({
      success: true,
      data: {
        document: {
          id: courtOrder._id,
          filename: courtOrder.originalFilename,
          fileHash: courtOrder.fileHash,
          documentType: courtOrder.documentType,
          uploadedAt: courtOrder.createdAt
        },
        requestStatus: request.status
      }
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload court order'
    });
  }
});

/**
 * GET /api/upload/:id
 * Retrieve document metadata
 */
router.get('/:id', authenticate, authorize('verifier', 'admin', 'government'), async (req, res) => {
  try {
    const document = await CourtOrder.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('verifiedBy', 'name email');

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: { document }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document'
    });
  }
});

/**
 * GET /api/upload/:id/download
 * Download or preview a court order file
 * Supports ?token= query param for browser <a> and <iframe> links
 * Supports ?inline=true to serve PDFs inline (for iframe preview)
 */
router.get('/:id/download', async (req, res) => {
  try {
    // Accept token via query param (browsers can't add auth headers to <a>/<iframe> tags)
    const tokenFromQuery = req.query.token;
    if (tokenFromQuery) {
      req.headers.authorization = `Bearer ${tokenFromQuery}`;
    }

    // Manual JWT verification
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });
    if (!['verifier', 'admin', 'government'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const document = await CourtOrder.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ success: false, error: 'File not found on disk' });
    }

    // V6: Apply caching and referrer restrictions for JWT-in-query links
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Referrer-Policy', 'no-referrer');

    // V14: Sanitize filename to prevent content-disposition / header injection
    const sanitizedFilename = document.originalFilename.replace(/["\r\n]/g, '');

    // For PDFs/images requested inline (iframe preview), serve with inline disposition
    const inline = req.query.inline === 'true';
    if (inline && (document.mimeType === 'application/pdf' || document.mimeType?.startsWith('image/'))) {
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);
      fs.createReadStream(document.filePath).pipe(res);
    } else {
      res.download(document.filePath, sanitizedFilename);
    }
  } catch (error) {
    console.error('[download] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to download document' });
  }
});

module.exports = router;
