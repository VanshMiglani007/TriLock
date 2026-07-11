"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-zinc-800">
      {/* Top Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-200 border-b ${
          scrolled
            ? "bg-zinc-950/90 backdrop-blur-md border-zinc-800"
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-xs tracking-tighter shadow-sm">
              TL
            </div>
            <span className="font-semibold tracking-tight text-zinc-100 text-base">
              TriLock Core
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#architecture" className="hover:text-zinc-100 transition-colors">
              Architecture
            </a>
            <a href="#portals" className="hover:text-zinc-100 transition-colors">
              Role Portals
            </a>
            <a href="#compliance" className="hover:text-zinc-100 transition-colors">
              Cryptographic Guarantees
            </a>
          </div>

          <Link href="/auth/login" className="btn-primary">
            Access Portal
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-36 pb-20 px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 mb-8 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Zero-Knowledge & Shamir Threshold Security v2.4
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-100 max-w-4xl leading-[1.1] mb-6">
          Surveillance with verifiable accountability.
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed mb-10">
          TriLock eliminates unilateral surveillance access. By combining Shamir secret sharing, dual judicial validation, and immutable transparency ledgers, surveillance data remains strictly locked until lawful warrants are cryptographically verified.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Link href="/auth/login" className="btn-primary w-full sm:w-auto px-6 py-3 text-base">
            Launch Portal
          </Link>
          <a href="#portals" className="btn-secondary w-full sm:w-auto px-6 py-3 text-base">
            Explore Portals
          </a>
        </div>
      </section>

      {/* Metric Strip */}
      <section className="border-y border-zinc-800/80 bg-[#0c0c0e] py-10 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex flex-col gap-1 border-b md:border-b-0 md:border-r border-zinc-800/80 pb-6 md:pb-0 md:pr-8">
            <span className="text-2xl font-bold text-zinc-100 font-mono">2-of-3 Threshold</span>
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Shamir Key Reconstruction</span>
          </div>
          <div className="flex flex-col gap-1 border-b md:border-b-0 md:border-r border-zinc-800/80 pb-6 md:pb-0 md:pr-8">
            <span className="text-2xl font-bold text-emerald-400 font-mono">SHA-256 Verified</span>
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Immutable Court Warrant Hashing</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold text-zinc-100 font-mono">100% Audited</span>
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Tamper-Proof Citizen Ledger</span>
          </div>
        </div>
      </section>

      {/* Role Portals Section */}
      <section id="portals" className="py-24 px-6 max-w-6xl mx-auto w-full">
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-2">
            Dedicated Workspaces
          </h2>
          <p className="text-zinc-400 text-sm max-w-xl">
            Each actor interacts through an isolated cryptographic view tailored to their clearance level and constitutional role.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Citizen Portal */}
          <div className="card-clean p-6 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Citizen Portal
                </span>
                <span className="text-xs text-emerald-400 font-medium">Privacy Protected</span>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Data Vault & Audit Log</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Monitor live data streams, inspect cryptographic access trails targeting your identity, and verify Shamir key share integrity in real time.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Demo: user@trilock.gov</span>
              <Link href="/auth/login" className="text-xs font-semibold text-zinc-200 group-hover:text-white flex items-center gap-1">
                Enter Workspace &rarr;
              </Link>
            </div>
          </div>

          {/* Government Portal */}
          <div className="card-clean p-6 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-950/50 text-indigo-300 border border-indigo-800/60">
                  Law Enforcement
                </span>
                <span className="text-xs text-indigo-400 font-medium">Warrant Required</span>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Warrant & Request Gateway</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Submit surveillance requests backed by signed court order documents. Execute break-glass emergency access under strict constitutional review.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Demo: officer@trilock.gov</span>
              <Link href="/auth/login" className="text-xs font-semibold text-zinc-200 group-hover:text-white flex items-center gap-1">
                Enter Workspace &rarr;
              </Link>
            </div>
          </div>

          {/* Judicial Verifier Portal */}
          <div className="card-clean p-6 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-800/60">
                  Judicial Authority
                </span>
                <span className="text-xs text-emerald-400 font-medium">Dual Review</span>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Warrant Verification Queue</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Independently verify court order SHA-256 hashes, review investigating officer credentials, and authorize cryptographic key release.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Demo: verifier@trilock.gov</span>
              <Link href="/auth/login" className="text-xs font-semibold text-zinc-200 group-hover:text-white flex items-center gap-1">
                Enter Workspace &rarr;
              </Link>
            </div>
          </div>

          {/* System Admin Portal */}
          <div className="card-clean p-6 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-800/60">
                  System Admin
                </span>
                <span className="text-xs text-amber-400 font-medium">Chain Auditor</span>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Audit Chain Inspector</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Validate end-to-end cryptographic ledger continuity, inspect system throughput, and oversee public safety vs privacy equilibrium.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Demo: admin@trilock.gov</span>
              <Link href="/auth/login" className="text-xs font-semibold text-zinc-200 group-hover:text-white flex items-center gap-1">
                Enter Workspace &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Architectural Workflow */}
      <section id="architecture" className="py-20 px-6 max-w-6xl mx-auto w-full border-t border-zinc-800/80">
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-2">
            Triple-Key Encryption Protocol
          </h2>
          <p className="text-zinc-400 text-sm max-w-xl">
            A three-step cryptographic pipeline ensuring absolute accountability at every access attempt.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0e0e11] border border-zinc-800/80 p-6 rounded-lg">
            <div className="text-xs font-mono text-zinc-500 mb-3">Phase 01</div>
            <h4 className="text-base font-semibold text-zinc-100 mb-2">Citizen Key Generation</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every citizen device derives an ephemeral TOTP key pair, encrypting local packet streams before transmission to the central data vault.
            </p>
          </div>

          <div className="bg-[#0e0e11] border border-zinc-800/80 p-6 rounded-lg">
            <div className="text-xs font-mono text-zinc-500 mb-3">Phase 02</div>
            <h4 className="text-base font-semibold text-zinc-100 mb-2">Judicial Hash Endorsement</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Law enforcement uploads signed warrant affidavits. The judicial authority verifies document SHA-256 signatures before authorizing share release.
            </p>
          </div>

          <div className="bg-[#0e0e11] border border-zinc-800/80 p-6 rounded-lg">
            <div className="text-xs font-mono text-zinc-500 mb-3">Phase 03</div>
            <h4 className="text-base font-semibold text-zinc-100 mb-2">Threshold Decryption</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              When 2 of 3 Shamir key shares converge, the requested surveillance packet decrypts in memory while permanently stamping an immutable audit entry.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800/80 py-8 px-6 bg-[#09090b]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>&copy; {new Date().getFullYear()} TriLock Cryptographic Framework. All rights reserved.</div>
          <div className="flex gap-6">
            <Link href="/auth/login" className="hover:text-zinc-400 transition-colors">Portal Access</Link>
            <a href="#portals" className="hover:text-zinc-400 transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
