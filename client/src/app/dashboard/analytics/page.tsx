"use client";

import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/auth";

interface OverviewData {
  totalUsers: number;
  totalVaults: number;
  totalPackets: number;
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  activeTokens: number;
  totalAuditLogs: number;
}

interface AuditLog {
  action: string;
  details: string;
  actorId: { name: string; role: string } | null;
  createdAt: string;
  caseNumber?: string;
}

export default function AnalyticsPage() {
  const { apiFetch } = useApi();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [privacyScore, setPrivacyScore] = useState(0);
  const [safetyScore, setSafetyScore] = useState(0);
  const [privacyFactors, setPrivacyFactors] = useState<Array<{ name: string; count: unknown; impact: number; description: string }>>([]);
  const [safetyFactors, setSafetyFactors] = useState<Array<{ name: string; count: unknown; impact: number; description: string }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, auditRes, privacyRes, safetyRes] = await Promise.allSettled([
        apiFetch("/analytics/dashboard"),
        apiFetch("/audit?limit=25"),
        apiFetch("/analytics/privacy-score"),
        apiFetch("/analytics/safety-score"),
      ]);
      if (analyticsRes.status === "fulfilled") setOverview((analyticsRes.value as { overview: OverviewData }).overview);
      if (auditRes.status === "fulfilled") setAuditLogs((auditRes.value as { logs?: AuditLog[] }).logs || []);
      if (privacyRes.status === "fulfilled") {
        const val = privacyRes.value as { privacyScore: number; factors?: Array<{ name: string; count: unknown; impact: number; description: string }> };
        setPrivacyScore(val.privacyScore);
        setPrivacyFactors(val.factors || []);
      }
      if (safetyRes.status === "fulfilled") {
        const val = safetyRes.value as { safetyScore: number; factors?: Array<{ name: string; count: unknown; impact: number; description: string }> };
        setSafetyScore(val.safetyScore);
        setSafetyFactors(val.factors || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const requestTotal = (overview?.totalRequests || 0) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Platform Analytics & Trust Index</h1>
          <p className="text-zinc-400 text-xs mt-1">Real-time cryptographic oversight, privacy ratios, and immutable telemetry events</p>
        </div>
        <button onClick={fetchData} className="btn-secondary text-xs py-2 px-3 shrink-0">
          Sync Metrics
        </button>
      </div>

      {/* Equilibrium Index Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-clean p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Privacy Protection Index</span>
              <span className="text-3xl font-mono font-bold text-zinc-100 mt-2 block">{privacyScore}%</span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Zero-Knowledge Threshold
            </span>
          </div>

          <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-5">
            <div className="h-1.5 rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${privacyScore}%` }} />
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-1.5">
            {privacyFactors.map((f, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-zinc-400">{f.name}</span>
                <span className={`font-mono ${f.impact >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {f.impact >= 0 ? `+${f.impact}` : f.impact}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-clean p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Lawful Safety Index</span>
              <span className="text-3xl font-mono font-bold text-zinc-100 mt-2 block">{safetyScore}%</span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Judicial Accountability
            </span>
          </div>

          <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-5">
            <div className="h-1.5 rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${safetyScore}%` }} />
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-1.5">
            {safetyFactors.map((f, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-zinc-400">{f.name}</span>
                <span className={`font-mono ${f.impact >= 0 ? "text-blue-400" : "text-red-400"}`}>
                  {f.impact >= 0 ? `+${f.impact}` : f.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Aggregate Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Total Citizens</span>
          <span className="text-xl font-mono font-bold text-zinc-100 mt-1 block">{overview?.totalUsers || 0}</span>
        </div>
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Shamir Vaults</span>
          <span className="text-xl font-mono font-bold text-zinc-100 mt-1 block">{overview?.totalVaults || 0}</span>
        </div>
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Encrypted Packets</span>
          <span className="text-xl font-mono font-bold text-zinc-100 mt-1 block">{overview?.totalPackets || 0}</span>
        </div>
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Immutable Logs</span>
          <span className="text-xl font-mono font-bold text-zinc-100 mt-1 block">{overview?.totalAuditLogs || 0}</span>
        </div>
      </div>

      {/* Pipeline Split */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 card-clean p-5">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-4 border-b border-zinc-800/80 pb-3">
            Surveillance Pipeline Throughput
          </h3>
          <div className="space-y-4 text-xs">
            {[
              { label: "Queued for Judicial Review", value: overview?.pendingRequests || 0, barClass: "bg-amber-400" },
              { label: "Judicially Endorsed Accesses", value: overview?.approvedRequests || 0, barClass: "bg-emerald-400" },
              { label: "Rejected Warrant Applications", value: overview?.rejectedRequests || 0, barClass: "bg-red-400" },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300">{item.label}</span>
                  <span className="font-mono font-semibold text-zinc-100">
                    {item.value} ({Math.round((item.value / requestTotal) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-1.5 rounded-full ${item.barClass}`} style={{ width: `${(item.value / requestTotal) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-5 card-clean p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-3">
              Active Ephemeral Tokens
            </h3>
            <div className="text-3xl font-mono font-bold text-zinc-100 py-2">
              {overview?.activeTokens || 0}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mt-1">
              Active tokens represent currently open time-limited decryption sessions. Upon expiration, decryption keys are cryptographically purged from memory.
            </p>
          </div>
          <div className="pt-4 border-t border-zinc-800/80">
            <span className={`px-2.5 py-1 rounded text-xs font-medium font-mono block text-center ${
              (overview?.activeTokens || 0) > 0
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800"
            }`}>
              {(overview?.activeTokens || 0) > 0 ? "Live Surveillance Stream Active" : "No Ephemeral Streams Active"}
            </span>
          </div>
        </div>
      </div>

      {/* Live Activity Stream Table */}
      <div className="card-clean overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 flex justify-between items-center">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Cryptographic Telemetry Ledger</h3>
          <span className="text-xs font-mono text-zinc-500">{auditLogs.length} recent events</span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No telemetry events recorded
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60 max-h-96 overflow-y-auto">
            {auditLogs.map((log, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between text-xs hover:bg-zinc-900/40 transition-colors">
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-zinc-200">{log.action}</span>
                    {log.caseNumber && (
                      <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400 border border-zinc-700">
                        #{log.caseNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-zinc-400 truncate block mt-0.5">{log.details}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-zinc-300 block">{log.actorId?.name || "System Core"}</span>
                  <span className="font-mono text-[11px] text-zinc-500 block mt-0.5">
                    {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
