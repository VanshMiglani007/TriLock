"use client";

import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function VerifierDashboard() {
  const { apiFetch } = useApi();
  const [requests, setRequests] = useState<Array<Record<string, unknown>>>([]);
  const [selectedRequest, setSelectedRequest] = useState<Record<string, unknown> | null>(null);
  const [reviewForm, setReviewForm] = useState({
    decision: "",
    comments: "",
    courtOrderAuthenticity: false,
    caseDetailsVerified: false,
    officerIdentityVerified: false,
    targetPersonConfirmed: false,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [viewingDoc, setViewingDoc] = useState<Record<string, unknown> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await apiFetch("/requests") as { requests?: Array<Record<string, unknown>> };
      setRequests(data.requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submitReview = async (decision: string) => {
    if (!selectedRequest || !decision) return;
    setSubmitting(true);
    setMessage("");
    try {
      await apiFetch("/reviews", {
        method: "POST",
        body: JSON.stringify({
          requestId: (selectedRequest._id || selectedRequest.id) as string,
          decision,
          comments: reviewForm.comments,
          verificationChecks: {
            courtOrderAuthenticity: reviewForm.courtOrderAuthenticity,
            caseDetailsVerified: reviewForm.caseDetailsVerified,
            officerIdentityVerified: reviewForm.officerIdentityVerified,
            targetPersonConfirmed: reviewForm.targetPersonConfirmed,
          },
        }),
      });
      setMessage(`Judicial determination recorded: ${decision.toUpperCase()}`);
      setSelectedRequest(null);
      setReviewForm({
        decision: "",
        comments: "",
        courtOrderAuthenticity: false,
        caseDetailsVerified: false,
        officerIdentityVerified: false,
        targetPersonConfirmed: false,
      });
      fetchData();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Review submission error");
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabels: Record<string, { text: string; badge: string }> = {
    documents_uploaded: { text: "Queued for Review", badge: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" },
    under_review: { text: "Active Examination", badge: "bg-purple-500/10 text-purple-300 border-purple-500/20" },
    reviewer_a_approved: { text: "1/2 Endorsed", badge: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
    approved: { text: "Fully Authorized", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    rejected: { text: "Rejected", badge: "bg-red-500/10 text-red-400 border-red-500/20" },
  };

  const getDownloadUrl = (docId: string) =>
    `${API_URL}/upload/${docId}/download?token=${localStorage.getItem("trilock_token")}`;

  const getInlineUrl = (docId: string) =>
    `${API_URL}/upload/${docId}/download?token=${localStorage.getItem("trilock_token")}&inline=true`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const proofDocs = selectedRequest
    ? (selectedRequest.proofDocuments as Array<Record<string, unknown>> | null) || []
    : [];

  const pendingRequests = requests.filter((r) =>
    ["documents_uploaded", "under_review", "reviewer_a_approved"].includes(r.status as string)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Judicial Verification Authority</h1>
        <p className="text-zinc-400 text-xs mt-1">
          Examine warrant affidavits, verify SHA-256 signatures, and register constitutional sign-offs
        </p>
      </div>

      {message && (
        <div className="p-3 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs flex justify-between items-center">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="text-zinc-500 hover:text-white font-mono">&times;</button>
        </div>
      )}

      {/* Main Review Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending Queue */}
        <div className="lg:col-span-5 card-clean overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/80 flex justify-between items-center">
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Docket Examination Queue</h3>
            <span className="text-xs font-mono text-zinc-500">{pendingRequests.length} pending</span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-500">
              All warrant applications have been processed by judicial review
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60 max-h-[580px] overflow-y-auto">
              {pendingRequests.map((req, i) => {
                const requester = req.requesterId as Record<string, string> | null;
                const target = req.targetUserId as Record<string, string> | null;
                const status = statusLabels[req.status as string] || {
                  text: req.status as string,
                  badge: "bg-zinc-800 text-zinc-300 border-zinc-700",
                };
                const isSelected = selectedRequest && ((selectedRequest._id || selectedRequest.id) === (req._id || req.id));
                const docs = (req.proofDocuments as Array<unknown> | null) || [];

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedRequest(req)}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected ? "bg-zinc-800/80 border-l-2 border-l-zinc-100" : "hover:bg-zinc-900/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono font-medium text-xs text-zinc-200">#{req.caseNumber as string}</span>
                      <div className="flex items-center gap-1.5">
                        {docs.length > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                            {docs.length} Exhibit{docs.length > 1 ? "s" : ""}
                          </span>
                        )}
                        <span className={`px-2 py-0.2 rounded text-[10px] font-medium border ${status.badge}`}>
                          {status.text}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 truncate mt-1">
                      Target: {target?.name || "Citizen"} &bull; {req.reason as string}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1.5">
                      Officer: {requester?.name || "Investigator"} ({requester?.department || "Gov"})
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Examination Workspace */}
        <div className="lg:col-span-7 card-clean p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-4 border-b border-zinc-800/80 pb-3">
              Judicial Review Workspace
            </h3>

            {!selectedRequest ? (
              <div className="py-24 text-center text-xs text-zinc-500">
                Select a docket case from the left queue to inspect affidavits and execute judicial determinations
              </div>
            ) : (
              <div className="space-y-5 text-xs max-h-[600px] overflow-y-auto pr-1">
                {/* Case Details Summary */}
                <div className="p-3.5 rounded bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div className="flex justify-between items-center font-mono font-medium text-zinc-200">
                    <span>Case Ref: #{selectedRequest.caseNumber as string}</span>
                    <span className="text-zinc-400 font-sans">Window: {selectedRequest.duration as number} Hours</span>
                  </div>
                  <div className="text-zinc-300">Cause: {selectedRequest.reason as string}</div>
                  <div className="text-zinc-400 text-[11px] leading-relaxed pt-1 border-t border-zinc-800/60">
                    {selectedRequest.investigationDetails as string}
                  </div>
                </div>

                {/* Exhibits List */}
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-2">
                    Submitted Affidavit Exhibits ({proofDocs.length})
                  </h4>
                  {proofDocs.length === 0 ? (
                    <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                      No legal exhibits attached. Signed court orders must be uploaded prior to authorization.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {proofDocs.map((doc, i) => {
                        const docId = (doc._id || doc.id) as string;
                        const filename = doc.originalFilename as string || `Exhibit-${i + 1}`;
                        const mimeType = doc.mimeType as string || "";
                        const fileHash = doc.fileHash as string || "";
                        const isImage = mimeType.startsWith("image/");
                        const isPdf = mimeType === "application/pdf";

                        return (
                          <div key={i} className="p-3 rounded bg-zinc-900 border border-zinc-800">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-mono font-medium text-zinc-200 truncate">{filename}</div>
                                {fileHash && (
                                  <div className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                                    SHA-256: {fileHash}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  onClick={() => setViewingDoc(viewingDoc?.id === docId ? null : { ...doc, id: docId })}
                                  className="btn-secondary text-xs py-1 px-2.5"
                                >
                                  {viewingDoc?.id === docId ? "Hide" : "Inspect"}
                                </button>
                                <a
                                  href={getDownloadUrl(docId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-secondary text-xs py-1 px-2.5"
                                >
                                  Download
                                </a>
                              </div>
                            </div>

                            {viewingDoc?.id === docId && (
                              <div className="mt-3 rounded border border-zinc-800 overflow-hidden bg-zinc-950">
                                {isPdf ? (
                                  <iframe src={getInlineUrl(docId)} className="w-full h-64 border-0" title={filename} />
                                ) : isImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={getDownloadUrl(docId)} alt={filename} className="w-full max-h-64 object-contain" />
                                ) : (
                                  <div className="p-4 text-center text-zinc-500 text-xs">
                                    Inline preview unavailable. Use download link to inspect file.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Checklist */}
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-2">Mandatory Constitutional Verification</h4>
                  <div className="space-y-2 bg-zinc-900/40 p-3 rounded border border-zinc-800/80">
                    {[
                      { key: "courtOrderAuthenticity", label: "Signed judicial warrant affidavit verified authentic" },
                      { key: "caseDetailsVerified", label: "Surveillance scope and duration conform to judicial order" },
                      { key: "officerIdentityVerified", label: "Investigating law enforcement officer credentials validated" },
                      { key: "targetPersonConfirmed", label: "Target citizen identity accurately matched against docket" },
                    ].map((check) => (
                      <label key={check.key} className="flex items-center gap-3 cursor-pointer text-xs text-zinc-300">
                        <input
                          type="checkbox"
                          checked={reviewForm[check.key as keyof typeof reviewForm] as boolean}
                          onChange={(e) => setReviewForm({ ...reviewForm, [check.key]: e.target.checked })}
                          className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-800 text-zinc-100 accent-white"
                        />
                        <span>{check.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Judicial Determination Rationale</label>
                  <textarea
                    value={reviewForm.comments}
                    onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                    className="input-clean min-h-[70px] resize-y"
                    placeholder="Enter formal notes or findings supporting approval or denial..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => submitReview("rejected")}
                    disabled={submitting}
                    className="btn-danger flex-1 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    Reject Warrant Application
                  </button>
                  <button
                    onClick={() => submitReview("approved")}
                    disabled={submitting}
                    className="btn-primary flex-1 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    Endorse Surveillance Warrant
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedRequest && (
            <div className="pt-4 mt-4 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500 text-right">
              Dual-review protocol active: requires independent concurrence from 2 judicial verifiers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
