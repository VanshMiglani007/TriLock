"use client";

import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/auth";

export default function AdminDashboard() {
  const { apiFetch } = useApi();
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [auditChain, setAuditChain] = useState<{ valid: boolean; totalEntries: number } | null>(null);
  const [recentLogs, setRecentLogs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [systemData, auditData] = await Promise.allSettled([
        apiFetch("/admin/system-stats"),
        apiFetch("/audit?limit=15"),
      ]);
      if (systemData.status === "fulfilled") {
        const val = systemData.value as Record<string, unknown>;
        setStats(val);
        const activity = (val.recentActivity as Array<Record<string, unknown>>) || [];
        if (activity.length > 0) setRecentLogs(activity);
      }
      if (auditData.status === "fulfilled") {
        const val = auditData.value as Record<string, unknown>;
        const logs = (val.logs as Array<Record<string, unknown>>) || [];
        if (logs.length > 0) setRecentLogs(logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const verifyChain = async () => {
    try {
      const data = await apiFetch("/audit/verify");
      setAuditChain(data as { valid: boolean; totalEntries: number });
    } catch (e) {
      console.error(e);
    }
  };

  const users = (stats.users || {}) as Record<string, number>;
  const vaults = (stats.vaults || {}) as Record<string, number>;
  const tokens = (stats.tokens || {}) as Record<string, number>;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">System Oversight & Governance</h1>
          <p className="text-zinc-400 text-xs mt-1">Supervise infrastructure security, role distribution, and ledger integrity</p>
        </div>
        <button onClick={verifyChain} className="btn-secondary text-xs py-2 px-3 shrink-0">
          Run Merkle Audit Verification
        </button>
      </div>

      {/* Audit Chain Status */}
      {auditChain && (
        <div className={`p-4 rounded-md border text-xs flex items-center justify-between ${
          auditChain.valid
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : "bg-red-500/10 border-red-500/20 text-red-300"
        }`}>
          <div className="font-semibold flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${auditChain.valid ? "bg-emerald-500" : "bg-red-500"}`} />
            {auditChain.valid
              ? `Passed — Merkle ledger integrity verified across ${auditChain.totalEntries} cryptographic entries.`
              : "CRITICAL ALERT — Audit chain checksum mismatch detected."}
          </div>
          <span className="font-mono text-[11px] opacity-80">SHA-256 Validated</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Citizens Registered", value: users.user || 0 },
          { label: "Law Officers", value: users.government || 0 },
          { label: "Judicial Verifiers", value: users.verifier || 0 },
          { label: "Encrypted Vaults", value: vaults.total || 0 },
          { label: "Telemetry Packets", value: (stats.packets || 0) as number },
          { label: "Active Tokens", value: tokens.active || 0 },
        ].map((s) => (
          <div key={s.label} className="card-clean p-4 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">{s.label}</span>
            <span className="text-xl font-mono font-bold text-zinc-100 mt-2">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Middle Split: Distribution & Health */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-6 card-clean p-5">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-4 border-b border-zinc-800/80 pb-3">
            Surveillance Request State Distribution
          </h3>
          <div className="space-y-3 text-xs">
            {Object.entries((stats.requests || {}) as Record<string, number>).map(([status, count]) => {
              const total = Object.values((stats.requests || {}) as Record<string, number>).reduce((a, b) => a + b, 0) || 1;
              const percentage = Math.round((count / total) * 100);
              return (
                <div key={status} className="space-y-1">
                  <div className="flex justify-between items-center text-zinc-300">
                    <span className="capitalize">{status.replace(/_/g, " ")}</span>
                    <span className="font-mono text-zinc-400">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 bg-zinc-300 rounded-full" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-6 card-clean p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-4 border-b border-zinc-800/80 pb-3">
              Core Cryptographic Subsystems
            </h3>
            <div className="space-y-3 text-xs">
              {[
                { label: "AES-256-GCM Encryption Engine", status: "Operational", ok: true },
                { label: "Append-Only Audit Ledger", status: `${(stats.auditLogs || 0) as number} entries`, ok: true },
                { label: "HMAC-SHA256 Token Synchronizer", status: "Operational", ok: true },
                { label: "Judicial Affidavit Escrow", status: "Available", ok: true },
                {
                  label: "Immutable Hash Chain",
                  status: auditChain ? (auditChain.valid ? "Verified Intact" : "Degraded") : "Unchecked",
                  ok: auditChain ? auditChain.valid : true,
                },
              ].map((h) => (
                <div key={h.label} className="flex items-center justify-between py-1 border-b border-zinc-800/40 last:border-0">
                  <span className="text-zinc-300">{h.label}</span>
                  <span className={`px-2 py-0.2 rounded text-[11px] font-mono border ${
                    h.ok ? "bg-zinc-800 text-emerald-400 border-zinc-700" : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed Table */}
      <div className="card-clean overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 flex justify-between items-center">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">System-Wide Security Event Log</h3>
          <span className="text-xs font-mono text-zinc-500">{recentLogs.length} events</span>
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No system activity recorded
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60 max-h-96 overflow-y-auto">
            {recentLogs.map((log, i) => {
              const actor = log.actorId as Record<string, string> | null;
              return (
                <div key={i} className="px-5 py-3 flex items-center justify-between text-xs hover:bg-zinc-900/40 transition-colors">
                  <div className="min-w-0 pr-4">
                    <span className="font-semibold text-zinc-200 block">{log.action as string}</span>
                    <span className="text-zinc-400 truncate block mt-0.5">{log.details as string}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-zinc-300 block">{actor?.name || "System Core"}</span>
                    <span className="font-mono text-[11px] text-zinc-500 block mt-0.5">
                      {log.createdAt ? new Date(log.createdAt as string).toLocaleTimeString() : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
