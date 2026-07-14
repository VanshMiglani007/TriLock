const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vault = require('../models/Vault');
const Key = require('../models/Key');
const { authenticate } = require('../middleware/auth');
const { generateKey } = require('../utils/encryption');
const { generateTOTPSecret } = require('../utils/totp');
const AuditLogger = require('../utils/auditLogger');

/**
 * POST /api/auth/register
 * Register a new user and create their vault + keys
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // V8: Stronger password validation (minimum 8 characters, at least 1 letter and 1 number)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long and contain both letters and numbers'
      });
    }

    // V13: Basic phone number validation if provided
    if (phoneNumber) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format check
      const normalizedPhone = String(phoneNumber).replace(/[\s-()]/g, '');
      if (!phoneRegex.test(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid phone number in E.164 format (e.g. +919876543210)'
        });
      }
    }

    // Create user — role is ALWAYS 'user' on self-registration.
    // Government, verifier, and admin accounts are created by seeding only.
    const user = await User.create({
      name,
      email,
      password,
      role: 'user',
      phoneNumber: phoneNumber ? String(phoneNumber).trim() : null,
      department: undefined,
      badgeNumber: undefined
    });

    // Create vault for regular users
    if (user.role === 'user') {
      await Vault.create({ userId: user._id });

      // Generate the three keys
      const keyTypes = ['user', 'government', 'platform'];
      for (const keyType of keyTypes) {
        await Key.create({
          userId: user._id,
          keyType,
          keyData: generateKey(),
          totpSecret: generateTOTPSecret(user._id.toString(), keyType)
        });
      }
    }

    // Log registration
    await AuditLogger.log({
      action: 'USER_REGISTERED',
      actorId: user._id,
      actorRole: user.role,
      details: `User ${user.name} registered with role: ${user.role}`
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user with password
    console.log("========== LOGIN ==========");
    console.log("Email received:", email);

    const user = await User.findOne({ email }).select("+password");

    console.log("User found:", !!user);

    if (user) {
      console.log("DB email:", user.email);
      console.log("Password hash:", user.password);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
    }

    const isMatch = await user.comparePassword(password);

    console.log("Password entered:", password);
    console.log("Password match:", isMatch);
    console.log("==========================");

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
    }

    // Log login
    await AuditLogger.log({
      action: 'USER_LOGIN',
      actorId: user._id,
      actorRole: user.role,
      details: `User ${user.name} logged in`
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

module.exports = router;
