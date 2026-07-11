"use client";

import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/auth";

interface AccessRequest {
  _id: string;
  caseNumber: string;
  reason: string;
  status: string;
  investigationDetails: string;
  duration: number;
  createdAt: string;
  requesterId: { name: string; email: string; department?: string };
  proofDocuments?: Array<{ originalFilename: string; _id: string }>;
  reviewerA?: { name: string };
  reviewerB?: { name: string };
}

export default function TransparencyPage() {
  const { apiFetch } = useApi();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await apiFetch("/requests") as { requests?: AccessRequest[] };
      setRequests(data.requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusConfig: Record<string, { label: string; badgeClass: string; desc: string }> = {
    pending: {
      label: "Awaiting Warrant",
      badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      desc: "Warrant request initiated; signed court order upload pending.",
    },
    documents_uploaded: {
      label: "Under Review",
      badgeClass: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
      desc: "Court order affidavit uploaded; queued for judicial review.",
    },
    under_review: {
      label: "Active Review",
      badgeClass: "bg-purple-500/10 text-purple-300 border-purple-500/20",
      desc: "Judicial verifier currently reviewing affidavit SHA-256 signatures.",
    },
    reviewer_a_approved: {
      label: "1/2 Reviewers Endorsed",
      badgeClass: "bg-blue-500/10 text-blue-300 border-blue-500/20",
      desc: "First judicial review passed; awaiting second reviewer concurrence.",
    },
    approved: {
      label: "Lawfully Authorized",
      badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
      desc: "Dual judicial approval verified. Ephemeral access share unlocked.",
    },
    rejected: {
      label: "Judicially Rejected",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      desc: "Warrant request rejected due to insufficient judicial cause.",
    },
    expired: {
      label: "Token Expired",
      badgeClass: "bg-zinc-800 text-zinc-400 border-zinc-700",
      desc: "Authorized access duration elapsed. Stream locked.",
    },
    revoked: {
      label: "Access Revoked",
      badgeClass: "bg-zinc-800 text-zinc-400 border-zinc-700",
      desc: "Emergency/warrant access revoked by verification authority.",
    },
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
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Audit & Transparency Ledger</h1>
        <p className="text-zinc-400 text-xs mt-1">
          Cryptographically signed audit trail of every warrant and data access request targeting your identity
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Total Warrants</span>
          <span className="text-xl font-mono font-bold text-zinc-100 mt-1 block">{requests.length}</span>
        </div>
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Authorized Access</span>
          <span className="text-xl font-mono font-bold text-red-400 mt-1 block">
            {requests.filter((r) => r.status === "approved").length}
          </span>
        </div>
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Rejected / Protected</span>
          <span className="text-xl font-mono font-bold text-emerald-400 mt-1 block">
            {requests.filter((r) => r.status === "rejected").length}
          </span>
        </div>
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">In Review</span>
          <span className="text-xl font-mono font-bold text-amber-400 mt-1 block">
            {requests.filter((r) =>
              ["pending", "documents_uploaded", "under_review", "reviewer_a_approved"].includes(r.status)
            ).length}
          </span>
        </div>
      </div>

      {/* Transparency Guarantee Banner */}
      <div className="card-clean px-5 py-3.5 bg-zinc-900/30 flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-zinc-200">Immutable Constitutional Transparency</span>
          <p className="text-xs text-zinc-400 mt-0.5">
            Every access request is permanently stamped to an append-only ledger before Shamir key reconstruction can begin.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
          Append-Only Ledger
        </span>
      </div>

      {/* Timeline & Details Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List Pane */}
        <div className="lg:col-span-6 card-clean overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/80 flex justify-between items-center">
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Warrant Activity Stream</h3>
            <span className="text-xs font-mono text-zinc-500">{requests.length} records</span>
          </div>

          {requests.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-500">
              No warrant or access requests logged targeting this identity
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60 max-h-[520px] overflow-y-auto">
              {requests.map((req) => {
                const config = statusConfig[req.status] || {
                  label: req.status,
                  badgeClass: "bg-zinc-800 text-zinc-300 border-zinc-700",
                  desc: "",
                };
                const isSelected = selectedRequest?._id === req._id;
                return (
                  <div
                    key={req._id}
                    onClick={() => setSelectedRequest(isSelected ? null : req)}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected ? "bg-zinc-800/80 border-l-2 border-l-zinc-100" : "hover:bg-zinc-900/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-mono font-medium text-xs text-zinc-200">Case #{req.caseNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${config.badgeClass}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 truncate">{req.reason}</div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                      <span>{req.requesterId?.name || "Officer"} ({req.requesterId?.department || "Gov"})</span>
                      <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inspection Pane */}
        <div className="lg:col-span-6 card-clean p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-4 border-b border-zinc-800/80 pb-3">
              Warrant Inspection Panel
            </h3>

            {!selectedRequest ? (
              <div className="py-20 text-center text-xs text-zinc-500">
                Select a warrant request from the activity stream to inspect judicial signatures and affidavits
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {(() => {
                  const config = statusConfig[selectedRequest.status] || {
                    label: selectedRequest.status,
                    badgeClass: "bg-zinc-800 text-zinc-300 border-zinc-700",
                    desc: "",
                  };
                  return (
                    <div className={`p-3 rounded-md border ${config.badgeClass}`}>
                      <div className="font-semibold">{config.label}</div>
                      <div className="text-[11px] mt-0.5 opacity-90">{config.desc}</div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/80">
                    <span className="text-[11px] text-zinc-500 block">Case Reference</span>
                    <span className="font-mono font-semibold text-zinc-200 mt-0.5 block">#{selectedRequest.caseNumber}</span>
                  </div>
                  <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/80">
                    <span className="text-[11px] text-zinc-500 block">Requested Window</span>
                    <span className="font-mono font-semibold text-zinc-200 mt-0.5 block">{selectedRequest.duration} Hours</span>
                  </div>
                </div>

                <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                  <span className="text-[11px] text-zinc-500 block">Investigating Officer</span>
                  <div className="font-medium text-zinc-200">{selectedRequest.requesterId?.name || "Unknown"}</div>
                  <div className="text-zinc-400 text-[11px]">
                    {selectedRequest.requesterId?.department || "General Division"} &bull; {selectedRequest.requesterId?.email}
                  </div>
                </div>

                <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                  <span className="text-[11px] text-zinc-500 block">Judicial Cause & Justification</span>
                  <div className="text-zinc-200">{selectedRequest.reason}</div>
                  <div className="text-zinc-400 text-[11px] pt-1">{selectedRequest.investigationDetails}</div>
                </div>

                <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/80 space-y-2">
                  <span className="text-[11px] text-zinc-500 block">Dual Judicial Sign-Off Status</span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Reviewer Alpha</span>
                    <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                      selectedRequest.reviewerA
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-800 text-zinc-500 border-zinc-700"
                    }`}>
                      {selectedRequest.reviewerA ? `Verified (${selectedRequest.reviewerA.name})` : "Pending Sign-Off"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Reviewer Beta</span>
                    <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                      selectedRequest.reviewerB
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-800 text-zinc-500 border-zinc-700"
                    }`}>
                      {selectedRequest.reviewerB ? `Verified (${selectedRequest.reviewerB.name})` : "Pending Sign-Off"}
                    </span>
                  </div>
                </div>

                {selectedRequest.proofDocuments && selectedRequest.proofDocuments.length > 0 && (
                  <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800/80 space-y-1.5">
                    <span className="text-[11px] text-zinc-500 block">Affidavit Exhibits ({selectedRequest.proofDocuments.length})</span>
                    {selectedRequest.proofDocuments.map((doc, i) => (
                      <div key={i} className="font-mono text-[11px] text-zinc-300 truncate">
                        Ex-{i + 1}: {doc.originalFilename}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedRequest && (
            <div className="pt-4 mt-4 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500 text-right">
              Recorded timestamp: {new Date(selectedRequest.createdAt).toISOString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
