"use client";

import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/auth";
import Link from "next/link";

export default function GovernmentDashboard() {
  const { apiFetch } = useApi();
  const [requests, setRequests] = useState<Array<Record<string, unknown>>>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const data = await apiFetch("/requests") as { requests?: Array<Record<string, unknown>> };
      const reqs = data.requests || [];
      setRequests(reqs);
      setStats({
        total: reqs.length,
        pending: reqs.filter((r: Record<string, unknown>) => ["pending", "documents_uploaded", "under_review", "reviewer_a_approved"].includes(r.status as string)).length,
        approved: reqs.filter((r: Record<string, unknown>) => r.status === "approved").length,
        rejected: reqs.filter((r: Record<string, unknown>) => r.status === "rejected").length,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusBadges: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    documents_uploaded: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
    under_review: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    reviewer_a_approved: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    expired: "bg-zinc-800 text-zinc-400 border-zinc-700",
    revoked: "bg-zinc-800 text-zinc-400 border-zinc-700",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Law Enforcement Operations</h1>
          <p className="text-zinc-400 text-xs mt-1">Manage active warrant requests and judicial document submissions</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/government/request" className="btn-primary text-xs py-2 px-3">
            New Warrant Request
          </Link>
          <Link href="/dashboard/government/emergency" className="btn-danger text-xs py-2 px-3">
            Emergency Break-Glass
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Total Filed</span>
          <span className="text-xl font-mono font-bold text-zinc-100 mt-1 block">{stats.total}</span>
        </div>
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">In Judicial Review</span>
          <span className="text-xl font-mono font-bold text-amber-400 mt-1 block">{stats.pending}</span>
        </div>
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Approved Warrants</span>
          <span className="text-xl font-mono font-bold text-emerald-400 mt-1 block">{stats.approved}</span>
        </div>
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Rejected</span>
          <span className="text-xl font-mono font-bold text-red-400 mt-1 block">{stats.rejected}</span>
        </div>
      </div>

      {/* Warrant Table */}
      <div className="card-clean overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 flex justify-between items-center">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Submitted Surveillance Warrants</h3>
          <span className="text-xs font-mono text-zinc-500">{requests.length} cases</span>
        </div>

        {requests.length === 0 ? (
          <div className="py-16 text-center">
            <span className="text-xs text-zinc-400 block font-medium">No warrant applications initiated</span>
            <Link href="/dashboard/government/request" className="btn-secondary text-xs mt-3 inline-block">
              Submit First Warrant Request
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {requests.map((req, i) => {
              const target = req.targetUserId as Record<string, string> | null;
              const statusClass = statusBadges[req.status as string] || "bg-zinc-800 text-zinc-300 border-zinc-700";
              return (
                <div key={i} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="font-mono font-medium text-xs text-zinc-200">#{req.caseNumber as string}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusClass}`}>
                        {(req.status as string).replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      <span className="text-zinc-300 font-medium">Target: {target?.name || target?.email || "Citizen"}</span>
                      <span className="mx-2 text-zinc-600">&bull;</span>
                      <span>{req.reason as string}</span>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500 shrink-0">
                    Filed: {new Date(req.createdAt as string).toLocaleDateString()}
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
