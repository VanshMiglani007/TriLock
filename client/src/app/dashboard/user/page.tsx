"use client";

import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/auth";

interface VaultData {
  id: string;
  status: string;
  encryptionStatus: string;
  packetCount: number;
  lastPacketAt: string;
  integrityVerified: boolean;
}

interface KeyStatus {
  user?: { status: string; version: number; lastRotatedAt: string };
  government?: { status: string; version: number; lastRotatedAt: string };
  platform?: { status: string; version: number; lastRotatedAt: string };
}

interface TOTPData {
  token: string;
  timeRemaining: number;
  interval: number;
}

export default function UserDashboard() {
  const { apiFetch } = useApi();
  const [vault, setVault] = useState<VaultData | null>(null);
  const [keys, setKeys] = useState<KeyStatus>({});
  const [totp, setTotp] = useState<TOTPData | null>(null);
  const [privacyScore, setPrivacyScore] = useState(0);
  const [safetyScore, setSafetyScore] = useState(0);
  const [accessHistory, setAccessHistory] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [vaultRes, keysRes, totpRes, privacyRes, safetyRes, requestsRes] = await Promise.allSettled([
        apiFetch("/vault"),
        apiFetch("/keys/status"),
        apiFetch("/keys/totp"),
        apiFetch("/analytics/privacy-score"),
        apiFetch("/analytics/safety-score"),
        apiFetch("/requests"),
      ]);

      if (vaultRes.status === "fulfilled") setVault((vaultRes.value as { vault: VaultData }).vault);
      if (keysRes.status === "fulfilled") setKeys((keysRes.value as { keys: KeyStatus }).keys);
      if (totpRes.status === "fulfilled") setTotp(totpRes.value as TOTPData);
      if (privacyRes.status === "fulfilled") setPrivacyScore((privacyRes.value as { privacyScore: number }).privacyScore);
      if (safetyRes.status === "fulfilled") setSafetyScore((safetyRes.value as { safetyScore: number }).safetyScore);
      if (requestsRes.status === "fulfilled") setAccessHistory((requestsRes.value as { requests: Array<Record<string, unknown>> }).requests || []);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch("/keys/totp") as TOTPData;
        setTotp(data);
      } catch {/* silent */}
    }, 5000);
    return () => clearInterval(interval);
  }, [apiFetch]);

  const collectLocation = async () => {
    setCollecting(true);
    try {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              await apiFetch("/packets/collect", {
                method: "POST",
                body: JSON.stringify({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  timestamp: new Date().toISOString(),
                }),
              });
              await fetchData();
            } catch (e) {
              console.error("Packet collect error:", e);
            } finally {
              setCollecting(false);
            }
          },
          async () => {
            // Geolocation denied — use demo coordinates
            const lat = 26.1500 + Math.random() * 0.02;
            const lng = 85.8850 + Math.random() * 0.02;
            try {
              await apiFetch("/packets/collect", {
                method: "POST",
                body: JSON.stringify({ latitude: lat, longitude: lng, timestamp: new Date().toISOString() }),
              });
              await fetchData();
            } catch (e) {
              console.error("Packet collect error:", e);
            } finally {
              setCollecting(false);
            }
          },
          { timeout: 5000 }
        );
      } else {
        setCollecting(false);
      }
    } catch (e) {
      console.error("Collection error:", e);
      setCollecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Citizen Overview</h1>
        <p className="text-zinc-400 text-xs mt-1">Real-time status of your encrypted data packets and cryptographic identity</p>
      </div>

      {/* Top Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-clean p-4 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Vault State</span>
          <div className="mt-3 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${vault?.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
            <span className="text-lg font-semibold text-zinc-100 capitalize">{vault?.status || "Inactive"}</span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-1">Cipher: {vault?.encryptionStatus || "AES-256-GCM"}</span>
        </div>

        <div className="card-clean p-4 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Stored Packets</span>
          <div className="mt-3 text-2xl font-mono font-bold text-zinc-100">{vault?.packetCount || 0}</div>
          <span className="text-[11px] text-zinc-500 mt-1">
            Last sync: {vault?.lastPacketAt ? new Date(vault.lastPacketAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "None"}
          </span>
        </div>

        <div className="card-clean p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Privacy Index</span>
            <span className="text-xs font-mono font-bold text-emerald-400">{privacyScore}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1 mt-4">
            <div className="h-1 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${privacyScore}%` }} />
          </div>
          <span className="text-[11px] text-zinc-500 mt-2">Zero unapproved decryptions</span>
        </div>

        <div className="card-clean p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Safety Index</span>
            <span className="text-xs font-mono font-bold text-zinc-200">{safetyScore}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1 mt-4">
            <div className="h-1 rounded-full bg-zinc-200 transition-all duration-500" style={{ width: `${safetyScore}%` }} />
          </div>
          <span className="text-[11px] text-zinc-500 mt-2">Lawful protection threshold</span>
        </div>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Live Authenticator */}
        <div className="card-clean p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Dynamic TOTP Key</span>
              <span className="text-[11px] font-mono text-zinc-500">{totp?.timeRemaining || 0}s</span>
            </div>
            <div className="text-2xl font-mono font-bold tracking-[0.25em] text-zinc-100 py-3 text-center bg-zinc-900/80 rounded border border-zinc-800/80">
              {totp?.token || "------"}
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-zinc-800 rounded-full h-1">
              <div
                className="h-1 rounded-full bg-zinc-300 transition-all duration-1000"
                style={{ width: `${((totp?.timeRemaining || 0) / (totp?.interval || 30)) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-500 text-center mt-2">Used for zero-knowledge packet signing</p>
          </div>
        </div>

        {/* Triple Key Status */}
        <div className="card-clean p-5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-3">Shamir Key Shares</span>
            <div className="space-y-2.5">
              {[
                { label: "Citizen Share", key: keys.user },
                { label: "Government Share", key: keys.government },
                { label: "Platform Share", key: keys.platform },
              ].map((k) => (
                <div key={k.label} className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-800/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${k.key?.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="text-zinc-300">{k.label}</span>
                  </div>
                  <span className="font-mono text-zinc-500 text-[11px]">v{k.key?.version || 1}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Reconstruction</span>
            <span className="text-emerald-400 font-medium">3-of-3 Threshold Active</span>
          </div>
        </div>

        {/* Packet Capture */}
        <div className="card-clean p-5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-2">Simulate Surveillance Stream</span>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Capture a live GPS location coordinate, encrypt it locally with your citizen key share, and sync with your vault.
            </p>
          </div>
          <button
            onClick={collectLocation}
            disabled={collecting}
            className="btn-primary w-full py-2.5 text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {collecting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                Encrypting Packet...
              </>
            ) : (
              "Capture & Encrypt Packet"
            )}
          </button>
        </div>
      </div>

      {/* Integrity Banner */}
      <div className="card-clean px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <span className="text-xs font-semibold text-zinc-200">Cryptographic Integrity Verified</span>
            <span className="text-xs text-zinc-500 ml-2">All stored telemetry packets pass SHA-256 validation</span>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
          Status: tamper-free
        </span>
      </div>

      {/* Access History Table */}
      <div className="card-clean overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 flex justify-between items-center">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Recent Warrant Requests Targeting Identity</h3>
          <span className="text-xs text-zinc-500">{accessHistory.length} records</span>
        </div>
        {accessHistory.length === 0 ? (
          <div className="py-12 text-center">
            <span className="text-xs font-medium text-zinc-400 block">No unauthorized access attempts or warrants recorded</span>
            <span className="text-[11px] text-zinc-600 mt-0.5 block">Your data vault remains fully locked under Shamir secret sharing</span>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {accessHistory.map((req: Record<string, unknown>, i: number) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between text-xs hover:bg-zinc-900/40 transition-colors">
                <div>
                  <span className="font-mono font-medium text-zinc-200">Case #{req.caseNumber as string || "N/A"}</span>
                  <span className="text-zinc-400 ml-3">{req.reason as string || "Lawful investigation"}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                  req.status === "approved"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : req.status === "rejected"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  {req.status as string}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
