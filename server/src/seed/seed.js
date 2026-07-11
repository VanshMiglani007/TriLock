require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Vault = require('../models/Vault');
const Packet = require('../models/Packet');
const Key = require('../models/Key');
const AccessRequest = require('../models/AccessRequest');
const Review = require('../models/Review');
const AuditLog = require('../models/AuditLog');
const { encryptPacket, generateKey } = require('../utils/encryption');
const { generateHash } = require('../utils/hashing');
const { generateTOTPSecret } = require('../utils/totp');
const AuditLogger = require('../utils/auditLogger');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Seed] Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Vault.deleteMany({}),
      Packet.deleteMany({}),
      Key.deleteMany({}),
      AccessRequest.deleteMany({}),
      Review.deleteMany({}),
      AuditLog.deleteMany({})
    ]);
    console.log('[Seed] Cleared existing data');

    // Create users
    const users = await User.create([
      {
        name: 'Aarav Sharma',
        email: 'citizen@trilock.demo',
        password: 'citizen123',
        role: 'user'
      },
      {
        name: 'Priya Patel',
        email: 'citizen2@trilock.demo',
        password: 'citizen123',
        role: 'user'
      },
      {
        name: 'Officer Rajesh Kumar',
        email: 'officer@trilock.demo',
        password: 'officer123',
        role: 'government',
        department: 'Cyber Crime Division',
        badgeNumber: 'GOV-2026-001'
      },
      {
        name: 'Reviewer Ananya Singh',
        email: 'reviewer1@trilock.demo',
        password: 'reviewer123',
        role: 'verifier'
      },
      {
        name: 'Reviewer Vikram Reddy',
        email: 'reviewer2@trilock.demo',
        password: 'reviewer123',
        role: 'verifier'
      },
      {
        name: 'Admin TriLock',
        email: 'admin@trilock.demo',
        password: 'admin123',
        role: 'admin'
      }
    ]);
    console.log(`[Seed] Created ${users.length} users`);

    const citizen = users[0];
    const citizen2 = users[1];
    const officer = users[2];

    // Create vaults for citizens
    const vault1 = await Vault.create({ userId: citizen._id });
    const vault2 = await Vault.create({ userId: citizen2._id });
    console.log('[Seed] Created vaults');

    // Generate keys for citizens
    for (const user of [citizen, citizen2]) {
      for (const keyType of ['user', 'government', 'platform']) {
        await Key.create({
          userId: user._id,
          keyType,
          keyData: generateKey(),
          totpSecret: generateTOTPSecret(user._id.toString(), keyType)
        });
      }
    }
    console.log('[Seed] Generated triple keys');

    // Create sample location packets
    const sampleLocations = [
      { latitude: 26.1542, longitude: 85.8918, timestamp: '2026-05-28T08:00:00Z' },
      { latitude: 26.1560, longitude: 85.8935, timestamp: '2026-05-28T09:30:00Z' },
      { latitude: 26.1500, longitude: 85.8900, timestamp: '2026-05-28T11:00:00Z' },
      { latitude: 26.1575, longitude: 85.8950, timestamp: '2026-05-28T14:15:00Z' },
      { latitude: 26.1530, longitude: 85.8880, timestamp: '2026-05-28T17:45:00Z' },
      { latitude: 26.1545, longitude: 85.8925, timestamp: '2026-05-29T08:30:00Z' },
      { latitude: 26.1600, longitude: 85.9000, timestamp: '2026-05-29T10:00:00Z' },
      { latitude: 26.1480, longitude: 85.8860, timestamp: '2026-05-29T12:30:00Z' },
      { latitude: 26.1555, longitude: 85.8940, timestamp: '2026-05-29T15:00:00Z' },
      { latitude: 26.1520, longitude: 85.8910, timestamp: '2026-05-29T18:00:00Z' },
    ];

    const platformKey = process.env.PLATFORM_ENCRYPTION_KEY;

    for (let i = 0; i < sampleLocations.length; i++) {
      const loc = sampleLocations[i];
      const packetId = `PKT-SEED-${String(i + 1).padStart(3, '0')}`;
      const { encryptedData, iv, authTag } = encryptPacket(loc, platformKey);
      const hash = generateHash(encryptedData + iv + authTag);

      await Packet.create({
        packetId,
        vaultId: vault1._id,
        userId: citizen._id,
        encryptedData,
        iv,
        authTag,
        hash,
        metadata: {
          collectedAt: new Date(loc.timestamp),
          packetSize: Buffer.byteLength(encryptedData, 'utf8')
        }
      });
    }

    // Update vault packet count
    vault1.packetCount = sampleLocations.length;
    vault1.lastPacketAt = new Date(sampleLocations[sampleLocations.length - 1].timestamp);
    await vault1.save();
    console.log(`[Seed] Created ${sampleLocations.length} encrypted location packets`);

    // Create sample audit logs
    await AuditLogger.log({
      action: 'USER_REGISTERED',
      actorId: citizen._id,
      actorRole: 'user',
      details: 'Citizen Aarav Sharma registered'
    });

    await AuditLogger.log({
      action: 'VAULT_CREATED',
      actorId: citizen._id,
      actorRole: 'user',
      details: 'Encrypted vault created for Aarav Sharma'
    });

    await AuditLogger.log({
      action: 'KEY_GENERATED',
      actorId: citizen._id,
      actorRole: 'system',
      details: 'Triple-key system initialized for Aarav Sharma'
    });

    for (let i = 0; i < sampleLocations.length; i++) {
      await AuditLogger.log({
        action: 'PACKET_COLLECTED',
        actorId: citizen._id,
        actorRole: 'user',
        details: `Location packet PKT-SEED-${String(i + 1).padStart(3, '0')} collected and encrypted`
      });
    }

    console.log('[Seed] Created audit logs');

    console.log('\n[Seed] ═══════════════════════════════════════');
    console.log('[Seed]   TriLock Database Seeded Successfully!');
    console.log('[Seed] ═══════════════════════════════════════');
    console.log('\n[Seed] Demo Accounts:');
    console.log('[Seed]   Citizen:    citizen@trilock.demo   / citizen123');
    console.log('[Seed]   Citizen 2:  citizen2@trilock.demo  / citizen123');
    console.log('[Seed]   Officer:    officer@trilock.demo   / officer123');
    console.log('[Seed]   Reviewer 1: reviewer1@trilock.demo / reviewer123');
    console.log('[Seed]   Reviewer 2: reviewer2@trilock.demo / reviewer123');
    console.log('[Seed]   Admin:      admin@trilock.demo     / admin123');
    console.log('[Seed] ═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error:', error);
    process.exit(1);
  }
}

seed();
