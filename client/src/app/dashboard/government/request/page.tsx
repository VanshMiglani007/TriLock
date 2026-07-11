"use client";

import { useState } from "react";
import { useApi } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function NewRequestPage() {
  const { apiFetch } = useApi();
  const router = useRouter();
  const [form, setForm] = useState({
    targetUserEmail: "",
    caseNumber: "",
    reason: "",
    investigationDetails: "",
    duration: "24",
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [requestId, setRequestId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/requests", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          duration: parseInt(form.duration),
          scope: { locationData: true, communicationMetadata: false },
        }),
      });
      setRequestId((data as { request: { id: string } }).request.id);
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initiate warrant application");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !requestId) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("requestId", requestId);
      formData.append("documentType", "court_order");

      const token = localStorage.getItem("trilock_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${apiUrl}/upload/court-order`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Affidavit upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Warrant Application Wizard</h1>
        <p className="text-zinc-400 text-xs mt-1">Initiate judicial review for targeted surveillance authorization</p>
      </div>

      {/* Wizard Stepper */}
      <div className="flex items-center gap-3 py-2 border-y border-zinc-800/80 text-xs">
        {["1. Case Specification", "2. Affidavit Upload", "3. Queued for Review"].map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-medium border ${
                isDone
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : isActive
                  ? "bg-zinc-100 text-zinc-950 border-white font-semibold"
                  : "bg-zinc-900 text-zinc-500 border-zinc-800"
              }`}>
                {isDone ? "Complete" : label}
              </span>
              {i < 2 && <span className="text-zinc-700 font-mono">&rarr;</span>}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="card-clean p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Target Citizen Email</label>
                <input
                  type="email"
                  value={form.targetUserEmail}
                  onChange={(e) => setForm({ ...form, targetUserEmail: e.target.value })}
                  className="input-clean"
                  placeholder="citizen@trilock.gov"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Judicial Case #</label>
                <input
                  type="text"
                  value={form.caseNumber}
                  onChange={(e) => setForm({ ...form, caseNumber: e.target.value })}
                  className="input-clean"
                  placeholder="CASE-2026-089"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Legal Justification Summary</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="input-clean"
                placeholder="Brief cause (min. 10 chars)"
                required
                minLength={10}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Detailed Probable Cause & Scope</label>
              <textarea
                value={form.investigationDetails}
                onChange={(e) => setForm({ ...form, investigationDetails: e.target.value })}
                className="input-clean min-h-[90px] resize-y"
                placeholder="Elaborate investigation parameters for judicial review (min. 20 chars)"
                required
                minLength={20}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Requested Authorization Window</label>
              <select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="input-clean"
              >
                <option value="24">24 Hours (Standard Warrant)</option>
                <option value="48">48 Hours (Extended Investigation)</option>
                <option value="72">72 Hours (Judicial Special Order)</option>
              </select>
            </div>

            <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400">
              Constitutional Constraint: Access scope is restricted exclusively to encrypted telemetry coordinates.
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-xs font-semibold">
              {loading ? "Registering Case..." : "Continue to Affidavit Upload"}
            </button>
          </form>
        </div>
      )}

      {step === 2 && (
        <div className="card-clean p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Affidavit & Signed Court Order</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Upload the digital exhibit or signed court warrant. SHA-256 digest will be recomputed upon judicial inspection.
            </p>
          </div>

          <div className="border border-dashed border-zinc-700/80 rounded-md p-8 text-center bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <span className="text-xs font-semibold text-zinc-200 block">
                {file ? file.name : "Select affidavit document file"}
              </span>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                PDF, JPEG, PNG, DOC (Maximum file size: 10MB)
              </span>
            </label>
          </div>

          {file && (
            <div className="p-3 rounded bg-zinc-900 border border-zinc-800 flex justify-between items-center text-xs">
              <span className="font-mono text-zinc-300">{file.name}</span>
              <span className="text-zinc-500 font-mono">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(1)} className="btn-secondary w-1/3 py-2 text-xs">
              Back
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="btn-primary flex-1 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {loading ? "Uploading Exhibit..." : "Submit Affidavit to Judicial Queue"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card-clean p-8 text-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-base font-bold">
            &check;
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Warrant Queued for Dual Judicial Review</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Your affidavit has been securely hashed and forwarded to independent verification authorities.
            </p>
          </div>

          <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800 text-xs font-mono max-w-xs mx-auto text-left">
            <div className="text-zinc-400">Case Reference: #{form.caseNumber}</div>
            <div className="text-emerald-400 mt-0.5">Status: Pending Judicial Sign-Off</div>
          </div>

          <div className="pt-2">
            <button onClick={() => router.push("/dashboard/government")} className="btn-secondary text-xs py-2 px-4">
              Return to Operations Queue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
