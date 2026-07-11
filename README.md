# 🔐 TriLock — Privacy-Preserving Surveillance Framework

[![Cybersecurity Hackathon 2026](https://img.shields.io/badge/Hackathon-2026-blueviolet.svg?style=flat-square)](#)
[![Theme: Surveillance vs Privacy](https://img.shields.io/badge/Theme-Surveillance%20vs%20Privacy-red.svg?style=flat-square)](#)
[![Tech Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20Express%20%7C%20MongoDB-cyan.svg?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](#)

> **Award-Winning Security Concept:** A zero-trust, triple-key encrypted framework designed to reconcile mass public safety requirements with constitutional citizen privacy rights.

---

## 🎯 The Core Philosophy

Modern surveillance systems present a false dichotomy: compromise public safety, or dismantle citizen privacy. **TriLock** is a cryptographic reconciliation protocol. 

By employing **Shamir's secret sharing threshold concept**, **dual-verifier authorization**, and a **tamper-evident Merkle-style audit ledger**, TriLock ensures that citizen location telemetry remains completely sealed until a court-approved warrant is verified by multiple independent judicial reviews.

---

## 🔐 Cryptographic Pillars

### 1. Triple-Key Threshold Encryption
All client telemetry is encrypted at rest using AES-256-GCM. Decryption is impossible without deriving the master key from three separate key shares:
* **Citizen Device Key Share:** Stored locally on the user's client device. Can be rotated at any time.
* **Law Enforcement Key Share:** Managed securely by the warrant verifier gateway.
* **Neutral Platform Key Share:** Kept in escrow by the core platform infrastructure.

> [!IMPORTANT]
> **No single authority** can access location coordinates alone. Only when a warrant is judicially signed off can the shares converge in memory to reconstruct the decryption key.

### 2. Immutable Hash-Chained Audit Ledger
Every system transaction (registrations, logins, warrant submissions, reviews, and decryptions) is appended to an immutable chronological ledger.
* Each log entry references the SHA-256 hash of the preceding entry.
* If any entry is retroactively altered, the hash-chain validation breaks immediately.
* Admins can trigger Merkle-style audit chain verification checks with a single click.

### 3. Absolute Citizen Transparency
Every time a warrant is authorized and location coordinates are decrypted, the citizen receives a real-time notification (via console logging or live **OmniDimension AI voice dispatch calls**). Citizens have a dedicated, cryptographically signed ledger showing exactly *who* accessed *what* data and *why*.

---

## 🏗️ System Architecture

The project consists of a high-performance Express API backend and a Next.js frontend styled with modern, immersive dark-mode aesthetics.

```
cyberhackathon/
├── client/          # Next.js 16 (App Router + TypeScript + Tailwind CSS)
└── server/          # Express.js API (Node.js + MongoDB/Mongoose)
```

### isolated Role Portals

| Role Portal | Endpoint | Theme | clearance Capability |
| :--- | :--- | :---: | :--- |
| **Citizen View** | `/dashboard/user` | **Cyan** | Manage local key shares, simulate location packets, and monitor audit trails. |
| **Government Gate** | `/dashboard/government` | **Purple** | File surveillance cases, upload PDF affidavits, and request decryption. |
| **Judicial Verifier** | `/dashboard/verifier` | **Green** | Inspect court warrants, sign off on checks, and release key shares. |
| **System Admin** | `/dashboard/admin` | **Amber** | Oversee system-wide metrics and trigger hash-chain integrity tests. |

---

## 🛡️ Recent Security Hardening & Audit

As part of a rigorous security audit, the code was hardened against the following vulnerabilities:
* **NoSQL Injection Defenses:** Escape sequences applied on regex parameters inside user search utilities to prevent ReDoS and injection.
* **API Rate-Limiting:** Added brute-force protection to auth endpoints (restricted to 20 requests per 15 minutes).
* **HTTP Security Headers:** Loaded `helmet` to automatically block common web vulnerabilities.
* **Pagination Constraints:** Implemented strict caps on paginated queries (max 100 entries per request) to prevent memory exhaustion DoS.
* **Safe Error Handling:** Removed verbose `error.message` output from sensitive endpoints to prevent internal server state leakage.
* **Download Hardening:** Configured `Cache-Control: no-store` and `Referrer-Policy: no-referrer` to shield time-limited JWT query strings used during warrant document downloads.

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

*Built with passion for Cybersecurity Hackathon 2026. Cryptographically securing public safety and human rights.*
