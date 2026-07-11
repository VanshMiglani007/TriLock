"use client";

import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/auth";

interface KeyData {
  status: string;
  version: number;
  lastRotatedAt: string;
  rotationInterval: number;
}

interface TOTPData {
  token: string;
  timeRemaining: number;
  interval: number;
}

export default function KeysPage() {
  const { apiFetch } = useApi();
  const [keys, setKeys] = useState<{
    user?: KeyData;
    government?: KeyData;
    platform?: KeyData;
  }>({});
  const [totp, setTotp] = useState<TOTPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [keysRes, totpRes] = await Promise.allSettled([
        apiFetch("/keys/status"),
        apiFetch("/keys/totp"),
      ]);
      if (keysRes.status === "fulfilled") setKeys((keysRes.value as { keys?: Record<string, unknown> }).keys || {});
      if (totpRes.status === "fulfilled") setTotp(totpRes.value as TOTPData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch("/keys/totp") as TOTPData;
        setTotp(data);
      } catch {/* silent */}
    }, 3000);
    return () => clearInterval(interval);
  }, [apiFetch]);

  const regenerateKey = async () => {
    setRegenerating(true);
    setMessage("");
    try {
      const data = await apiFetch("/keys/regenerate", { method: "POST" }) as { version?: number | string };
      setMessage(`Citizen key successfully rotated to version v${data.version || 2}`);
      fetchData();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Key rotation failed");
    } finally {
      setRegenerating(false);
    }
  };

  const keyConfigs = [
    {
      type: "user" as const,
      label: "Citizen Device Share",
      badge: "Local Share",
      description: "Ephemeral private key held exclusively on your client device. Rotating advances your key epoch.",
      canRegenerate: true,
    },
    {
      type: "government" as const,
      label: "Law Enforcement Share",
      badge: "Judicial Share",
      description: "Held by warrant verification servers. Released only upon verified judicial order.",
      canRegenerate: false,
    },
    {
      type: "platform" as const,
      label: "Platform Infrastructure Share",
      badge: "Escrow Share",
      description: "Neutral cryptographic escrow verifying zero-knowledge constraints.",
      canRegenerate: false,
    },
  ];

  const totpProgress = totp ? ((totp.timeRemaining / totp.interval) * 100) : 0;

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
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Cryptographic Keys & Shares</h1>
        <p className="text-zinc-400 text-xs mt-1">Inspect your Shamir secret threshold status and dynamic authenticator tokens</p>
      </div>

      {message && (
        <div className="p-3 rounded-md text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="text-zinc-500 hover:text-white font-mono text-xs">&times;</button>
        </div>
      )}

      {/* Live Authenticator Panel */}
      <div className="card-clean p-6 flex flex-col items-center justify-center text-center bg-[#0c0c0e]">
        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2">
          Active Zero-Knowledge Token
        </span>
        <div className="text-4xl sm:text-5xl font-mono font-bold tracking-[0.35em] text-zinc-100 py-4">
          {totp?.token || "------"}
        </div>

        <div className="flex items-center justify-center gap-3 w-full max-w-xs mt-1">
          <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-zinc-300 transition-all duration-1000"
              style={{ width: `${totpProgress}%` }}
            />
          </div>
          <span className="text-zinc-500 text-xs font-mono w-8 text-right">{totp?.timeRemaining || 0}s</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-3">Refreshes every 30 seconds via HMAC-SHA256 time sync</p>
      </div>

      {/* Threshold Status Banner */}
      <div className="card-clean p-4 bg-zinc-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-semibold text-zinc-200">3-Share Threshold Protocol Active</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Decryption requires all 3 Shamir shares simultaneously. No individual share can reconstruct surveillance telemetry alone.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-zinc-800 text-emerald-400 border border-zinc-700 shrink-0">
          3-of-3 Threshold Active
        </span>
      </div>

      {/* Key Shares List */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Assigned Cryptographic Shares</h3>
        {keyConfigs.map((config) => {
          const keyData = keys[config.type];
          return (
            <div key={config.type} className="card-clean p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className={`w-2 h-2 rounded-full ${keyData?.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
                  <h4 className="text-sm font-semibold text-zinc-100">{config.label}</h4>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    v{keyData?.version || 1}
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400">
                    {config.badge}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">{config.description}</p>
                <div className="mt-2 text-[11px] font-mono text-zinc-500 flex gap-4">
                  <span>Last Rotated: {keyData?.lastRotatedAt ? new Date(keyData.lastRotatedAt).toLocaleDateString() : "Never"}</span>
                  <span>Interval: {keyData?.rotationInterval || 30}s</span>
                </div>
              </div>

              {config.canRegenerate && (
                <button
                  onClick={regenerateKey}
                  disabled={regenerating}
                  className="btn-secondary text-xs shrink-0 py-2 px-3"
                >
                  {regenerating ? "Rotating..." : "Rotate Share Key"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
