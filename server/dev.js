/**
 * TriLock Development Launcher
 * Starts an in-memory MongoDB instance, seeds demo data, then launches the Express server.
 * Use this for local development when MongoDB is not installed.
 * 
 * Usage: node dev.js
 * 
 * Demo Credentials:
 *   Citizen:     citizen@trilock.demo    / citizen123
 *   Officer:     officer@trilock.demo    / officer123
 *   Reviewer 1:  reviewer1@trilock.demo  / reviewer123
 *   Reviewer 2:  reviewer2@trilock.demo  / reviewer123
 *   Admin:       admin@trilock.demo      / admin123
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: true });

async function startDev() {
  try {
    // Try to use mongodb-memory-server for local dev
    const { MongoMemoryServer } = require('mongodb-memory-server');
    
    console.log('\n[TriLock Dev] Starting in-memory MongoDB...');
    const mongod = await MongoMemoryServer.create({
      instance: {
        dbName: 'trilock'
      }
    });
    
    const uri = mongod.getUri() + 'trilock';
    process.env.MONGODB_URI = uri;
    console.log(`[TriLock Dev] MongoDB ready`);
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n[TriLock Dev] Shutting down...');
      await mongod.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await mongod.stop();
      process.exit(0);
    });
    
    // Now start the main app
    require('./src/index.js');
    
    // Seed demo data after a short delay (let DB connect first)
    setTimeout(async () => {
      try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
          const User = require('./src/models/User');
          const existingUsers = await User.countDocuments();
          if (existingUsers === 0) {
            console.log('[TriLock Dev] Seeding demo data...');
            const { execSync } = require('child_process');
            // Seed using the same process so it shares the mongoose connection
            await seedData();
            console.log('[TriLock Dev] Demo data seeded successfully!');
            printDemoCredentials();
          } else {
            console.log(`[TriLock Dev] Database already has ${existingUsers} users - skipping seed`);
          }
        }
      } catch (e) {
        console.log('[TriLock Dev] Auto-seed skipped:', e.message);
      }
    }, 2000);
    
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('[TriLock Dev] mongodb-memory-server not installed.');
      console.log('[TriLock Dev] Attempting to connect to local MongoDB...');
      console.log('[TriLock Dev] Make sure MongoDB is running on mongodb://localhost:27017\n');
      require('./src/index.js');
    } else {
      console.error('[TriLock Dev] Error:', err.message);
      process.exit(1);
    }
  }
}

async function seedData() {
  const mongoose = require('mongoose');
  const User = require('./src/models/User');
  const Vault = require('./src/models/Vault');
  const Key = require('./src/models/Key');
  const AuditLog = require('./src/models/AuditLog');
  const { generateKey } = require('./src/utils/encryption');
  const { generateTOTPSecret } = require('./src/utils/totp');
  const AuditLogger = require('./src/utils/auditLogger');

  // Create users
  const users = await User.create([
    { name: 'Aarav Sharma', email: 'citizen@trilock.demo', password: 'citizen123', role: 'user', phoneNumber: '+919470857177' },
    { name: 'Priya Patel', email: 'citizen2@trilock.demo', password: 'citizen123', role: 'user' },
    { name: 'Officer Rajesh Kumar', email: 'officer@trilock.demo', password: 'officer123', role: 'government', department: 'Cyber Crime Division', badgeNumber: 'GOV-2026-001' },
    { name: 'Reviewer Ananya Singh', email: 'reviewer1@trilock.demo', password: 'reviewer123', role: 'verifier' },
    { name: 'Reviewer Vikram Reddy', email: 'reviewer2@trilock.demo', password: 'reviewer123', role: 'verifier' },
    { name: 'Admin TriLock', email: 'admin@trilock.demo', password: 'admin123', role: 'admin' }
  ]);

  // Create vaults and keys for citizen users
  for (const user of users.filter(u => u.role === 'user')) {
    await Vault.create({ userId: user._id });
    for (const keyType of ['user', 'government', 'platform']) {
      await Key.create({
        userId: user._id,
        keyType,
        keyData: generateKey(),
        totpSecret: generateTOTPSecret(user._id.toString(), keyType)
      });
    }
  }

  // Log seed events sequentially to avoid sequenceNumber race conditions
  for (const user of users) {
    await AuditLogger.log({
      action: 'USER_REGISTERED',
      actorId: user._id,
      actorRole: user.role,
      details: `[DEMO] ${user.name} registered with role: ${user.role}`
    });
  }
}

function printDemoCredentials() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║              TRILOCK DEMO CREDENTIALS                ║
╠══════════════════════════════════════════════════════╣
║  Citizen:    citizen@trilock.demo   / citizen123     ║
║  Citizen 2:  citizen2@trilock.demo  / citizen123     ║
║  Officer:    officer@trilock.demo   / officer123     ║
║  Reviewer 1: reviewer1@trilock.demo / reviewer123    ║
║  Reviewer 2: reviewer2@trilock.demo / reviewer123    ║
║  Admin:      admin@trilock.demo     / admin123       ║
╚══════════════════════════════════════════════════════╝
  `);
}

startDev();
