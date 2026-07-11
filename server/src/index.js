const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

// ── Security Headers (V3) ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,        // CSP disabled — API-only server, no HTML served
  crossOriginEmbedderPolicy: false     // Allow iframe embeds of court order previews
}));

// ── CORS (V12) — configurable via env var with localhost fallback ──────
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// ── Request ID for audit correlation (V11) ─────────────────────────────
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ── Rate Limiting on auth endpoints (V2) ───────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15-minute window
  max: 20,                      // max 20 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Please try again later.' }
});
app.use('/api/auth', authLimiter);

// ── Body Parsers ───────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// NOTE: uploads are NOT served as static files.
// Court order files are only accessible via the authenticated /api/upload/:id/download endpoint.

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vault', require('./routes/vault'));
app.use('/api/packets', require('./routes/packets'));
app.use('/api/keys', require('./routes/keys'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'TriLock API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[TriLock Error] ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: 'An internal error occurred'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║       TriLock API Server v1.0.0          ║
  ║       Running on port ${PORT}               ║
  ║       Environment: development           ║
  ╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
