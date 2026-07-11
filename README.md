# 🔐 TriLock — Enterprise Privacy-Preserving Surveillance Framework

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg?style=flat-square)](#)
[![Security Status](https://img.shields.io/badge/security-audited-blue.svg?style=flat-square)](#)
[![Tech Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Express%20%7C%20MongoDB-cyan.svg?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](#)

TriLock is a zero-trust, enterprise-grade privacy-preserving surveillance framework designed to balance municipal public safety requirements with constitutional citizen privacy rights. The platform leverages advanced cryptography, multi-party threshold authorization, and immutable logging to prevent unauthorized telemetry access.

---

## 🎯 System Philosophy

Traditional data surveillance systems represent a structural compromise: either sacrifice public safety by restricting access, or compromise civil liberties with unchecked monitoring. **TriLock** resolves this through cryptographic separation of authority.

By utilizing **Shamir's secret sharing threshold scheme**, **dual-verifier digital signatures**, and a **tamper-evident cryptographic ledger**, TriLock guarantees that citizen telemetry remains fully sealed at rest and in transit. Access is only reconstructed dynamically under legally authorized, multi-party verified conditions.

---

## 🔐 Cryptographic Architecture

### 1. Triple-Key Threshold Cryptography
Telemetry is encrypted at rest using `AES-256-GCM`. The master decryption key is never stored. Instead, it is derived dynamically when three separate cryptographic key shares converge:
* **Citizen Device Key Share:** Stored on the user's client device; supports rotatable key epochs.
* **Law Enforcement Key Share:** Managed by the security gateway.
* **Neutral Platform Key Share:** Kept in escrow by the core platform infrastructure.

> [!IMPORTANT]
> Decryption is impossible unless all three distinct key shares are dynamically assembled in memory. No single party can decrypt or access location history unilaterally.

### 2. Hash-Chained Audit Ledger
Every transaction (user registration, authentication, key rotation, warrant application, review, and data access) is written to a sequential, append-only security ledger.
* Every block references the SHA-256 hash of the preceding block.
* Any unauthorized modification breaks the hash chain validation immediately.
* Admins can run verification checks to validate ledger continuity.

### 3. Absolute Citizen Transparency
Whenever a warrant is authorized and data is accessed, a background notification pipeline notifies the citizen via real-time triggers (with support for integrated **OmniDimension AI voice alerts**). Citizens have a dedicated dashboard displaying the complete audit history of who requested their data, when it was decrypted, and the judicial cause.

---

## 🏗️ System Components

The project is structured with a modular API service and a modern, high-performance Next.js dashboard UI.

```
cyberhackathon/
├── client/          # Next.js 16 (App Router + TypeScript + Tailwind CSS)
└── server/          # ExpressJS REST API (NodeJS + Mongoose + MongoDB)
```

### Isolated Role Portals

| Portal | Scope & Capabilities | Security Clearance |
| :--- | :--- | :---: |
| **Citizen View** | Monitor vault status, execute device key rotation, inspect audit trails. | User Level |
| **Law Enforcement** | File warrant requests, upload signed PDFs, invoke emergency keys. | Officer Level |
| **Verification Authority** | Independent judicial warrant verification queue & dual-signature checklist. | Verifier Level |
| **System Administration** | Health metrics, user directory oversight, audit ledger validation. | System Administrator |

---

## 🛡️ Security Audit & Hardening
The codebase has undergone a security review and implements protection against:
* **NoSQL Injection:** Parameter sanitization on regex queries.
* **DoS Attacks:** Express rate limiters on authentication routes (20 requests per 15 mins) and strict pagination caps.
* **Data Leakage:** Removal of raw developer error stack traces from production payloads.
* **JWT Exposure:** Caching restrictions and referrer shields applied to file preview links during warrant document downloads.

---

## 🎭 Demo Credentials

Use these pre-seeded development accounts to test the system:

| Role Portal | Credentials | Password |
| :--- | :--- | :--- |
| **Citizen (User)** | `citizen@trilock.demo` | `citizen123` |
| **Citizen 2 (User)** | `citizen2@trilock.demo` | `citizen123` |
| **Government Officer** | `officer@trilock.demo` | `officer123` |
| **Judicial Reviewer A** | `reviewer1@trilock.demo` | `reviewer123` |
| **Judicial Reviewer B** | `reviewer2@trilock.demo` | `reviewer123` |
| **Platform Admin** | `admin@trilock.demo` | `admin123` |

---

## 🔄 End-to-End Demo Walkthrough

Try this testing flow to see the full framework in action:
1. **Login as Citizen** (`citizen@trilock.demo`) -> Click **Capture & Encrypt Packet** to simulate location tracking. Go to **Data Vault** to view the encrypted, hashed records.
2. **Login as Government Officer** (`officer@trilock.demo`) -> Click **New Warrant Request** -> Enter the citizen's email and legal justification -> **Upload any PDF/Image** as the signed court affidavit.
3. **Login as Reviewer 1** (`reviewer1@trilock.demo`) -> Click the case docket -> Complete the constitutional checklist -> Click **Endorse**.
4. **Login as Reviewer 2** (`reviewer2@trilock.demo`) -> Locate the same case docket -> Click **Endorse** (Dual-reviewer verification complete).
5. **Login as Government Officer** (`officer@trilock.demo`) -> Open the **Emergency Break-Glass** gateway -> Generate an ephemeral access token -> Click **Decrypt Stream** to view the decrypted location coordinates.
6. **Login as Citizen** (`citizen@trilock.demo`) -> Go to the **Audit Trail** to see the chronological record of the search warrant and data decryption.

---

## ⚙️ Local Installation & Setup

### Prerequisites
* **Node.js** v18 or later
* **npm** v9 or later
* **MongoDB** v6.x running locally on `localhost:27017`

### Step 1: Environment Variables
Create a `.env` file in the root of the project with:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/trilock
JWT_SECRET=your_jwt_secret_key
PLATFORM_ENCRYPTION_KEY=your_64_character_hex_string
TOTP_SECRET=your_totp_secret_string
UPLOAD_DIR=./uploads
```

### Step 2: Initialize the Backend
```bash
cd server
npm install
npm run seed     # Seeds all demo accounts and initial telemetry
npm run dev      # Starts on http://localhost:5000
```
*(Alternatively, run `npm run dev:mem` to run a fully automated in-memory MongoDB database.)*

### Step 3: Initialize the Frontend
```bash
cd client
npm install
npm run dev      # Starts Next.js app on http://localhost:3000
```

---

*Designed and engineered with a focus on modern security standards, zero-trust architectures, and data privacy rights.*
