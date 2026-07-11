"use client";

import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/auth";

type AccessData = Record<string, unknown>;
type EmergencyToken = {
  id: string;
  token: string;
  requestId: string;
  caseNumber: string;
  expiresAt: string;
  revoked: boolean;
  accessCount: number;
  isValid: boolean;
};
type ApprovedRequest = Record<string, unknown>;

export default function EmergencyPage() {
  const { apiFetch } = useApi();
  const [approvedRequests, setApprovedRequests] = useState<ApprovedRequest[]>([]);
  const [existingTokenMap, setExistingTokenMap] = useState<Record<string, EmergencyToken>>({});
  const [sessionTokens, setSessionTokens] = useState<EmergencyToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessData, setAccessData] = useState<AccessData | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [tripleKeyMode, setTripleKeyMode] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [citizenKeyPreview, setCitizenKeyPreview] = useState("");
  const [performingTripleKey, setPerformingTripleKey] = useState(false);
  const [tripleKeyData, setTripleKeyData] = useState<AccessData | null>(null);
  const [fetchingKey, setFetchingKey] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, tokRes] = await Promise.allSettled([
        apiFetch("/requests?status=approved"),
        apiFetch("/emergency/my-tokens"),
      ]);

      if (reqRes.status === "fulfilled") {
        setApprovedRequests((reqRes.value as { requests?: ApprovedRequest[] }).requests || []);
      }

      if (tokRes.status === "fulfilled") {
        const tokens: EmergencyToken[] = (tokRes.value as { tokens?: EmergencyToken[] }).tokens || [];
        const map: Record<string, EmergencyToken> = {};
        for (const t of tokens) {
          if (!map[t.requestId] || (t.isValid && !map[t.requestId].isValid)) {
            map[t.requestId] = t;
          }
        }
        setExistingTokenMap(map);
        setSessionTokens(tokens.filter((t) => t.isValid));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateToken = async (requestId: string) => {
    setGenerating(requestId);
    setError("");
    try {
      const data = await apiFetch("/emergency/token", {
        method: "POST",
        body: JSON.stringify({ requestId }),
      }) as { emergencyToken: Record<string, string> };
      const newToken: EmergencyToken = {
        id: data.emergencyToken._id || data.emergencyToken.id,
        token: data.emergencyToken.token,
        requestId: data.emergencyToken.requestId || requestId,
        caseNumber: data.emergencyToken.caseNumber,
        expiresAt: data.emergencyToken.expiresAt,
        revoked: false,
        accessCount: 0,
        isValid: true,
      };
      setSessionTokens((prev) => [newToken, ...prev]);
      setExistingTokenMap((prev) => ({ ...prev, [requestId]: newToken }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate access share token";
      if (msg.toLowerCase().includes("already exists")) {
        setError("Token already active — refreshing state...");
        await fetchData();
        setError("");
      } else {
        setError(msg);
      }
    } finally {
      setGenerating(null);
    }
  };

  const useToken = async (token: string) => {
    setError("");
    try {
      const data = await apiFetch(`/emergency/access/${token}`) as AccessData;
      setAccessData(data);
      setTripleKeyData(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Access token verification failed");
    }
  };

  const fetchCitizenKey = async (requestId: string) => {
    setFetchingKey(true);
    setError("");
    try {
      const data = await apiFetch(`/keys/citizen-key/${requestId}`) as { citizenKeyData?: string };
      setCitizenKeyPreview(data.citizenKeyData || "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to retrieve citizen share. Verify approved warrant token.");
      setCitizenKeyPreview("");
    } finally {
      setFetchingKey(false);
    }
  };

  const performTripleKeyAccess = async () => {
    if (!selectedRequestId || !citizenKeyPreview) return;
    setPerformingTripleKey(true);
    setError("");
    try {
      const data = await apiFetch("/keys/triple-access", {
        method: "POST",
        body: JSON.stringify({ requestId: selectedRequestId, citizenKeyData: citizenKeyPreview }),
      }) as AccessData;
      setTripleKeyData(data);
      setAccessData(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Shamir threshold reconstruction failed");
    } finally {
      setPerformingTripleKey(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayData = (tripleKeyData || accessData) as AccessData | null;
  const packets = ((displayData?.locationPackets || displayData?.decryptedPackets) as Array<Record<string, unknown>> | undefined) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Judicial Access & Decryption Gateway</h1>
        <p className="text-zinc-400 text-xs mt-1">
          Execute lawful decryption via dual-review access tokens or Shamir 3-of-3 threshold reconstruction
        </p>
      </div>

      {/* Warning Banner */}
      <div className="card-clean p-4 bg-red-950/20 border-red-900/40 text-xs text-red-400 flex items-center justify-between">
        <span>Constitutional Audit Notice: All data accesses are permanently committed to the citizen transparency ledger.</span>
        <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-red-900/30">Mandatory Log</span>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Mode Toggle */}
      <div className="card-clean p-2 flex gap-2">
        <button
          onClick={() => { setTripleKeyMode(false); setTripleKeyData(null); setError(""); }}
          className={`flex-1 py-2.5 rounded-md text-xs font-semibold transition-all ${
            !tripleKeyMode
              ? "bg-zinc-100 text-zinc-950 shadow"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Approved Warrant Access Tokens
        </button>
        <button
          onClick={() => { setTripleKeyMode(true); setAccessData(null); setError(""); }}
          className={`flex-1 py-2.5 rounded-md text-xs font-semibold transition-all ${
            tripleKeyMode
              ? "bg-zinc-100 text-zinc-950 shadow"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Shamir 3-of-3 Threshold Reconstruction
        </button>
      </div>

      {/* TOKEN ACCESS MODE */}
      {!tripleKeyMode && (
        <div className="space-y-4">
          <div className="card-clean p-5 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Judicially Approved Cases</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Generate or invoke ephemeral access tokens for verified warrants</p>
            </div>

            {approvedRequests.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                No judicially approved warrants currently active in your docket
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {approvedRequests.map((req, i) => {
                  const reqId = (req._id || req.id) as string;
                  const target = req.targetUserId as Record<string, string> | null;
                  const existing = existingTokenMap[reqId];
                  const hasValidToken = existing?.isValid === true;
                  const hasExpiredToken = existing && !existing.isValid;

                  return (
                    <div key={i} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-medium text-xs text-zinc-200">Case #{req.caseNumber as string}</span>
                          {hasValidToken && (
                            <span className="px-2 py-0.2 text-[10px] rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                              Active Share
                            </span>
                          )}
                          {hasExpiredToken && (
                            <span className="px-2 py-0.2 text-[10px] rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                              Token Expired
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400">
                          Target: {target?.name || "Citizen"} &bull; Authorized Window: {req.duration as number} Hours
                        </div>
                        {hasValidToken && (
                          <div className="mt-2 font-mono text-[11px] text-zinc-500 p-2 bg-zinc-900 rounded border border-zinc-800 break-all">
                            Token: {existing.token}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 flex gap-2">
                        {hasValidToken ? (
                          <button onClick={() => useToken(existing.token)} className="btn-primary text-xs py-2 px-4">
                            Decrypt Stream
                          </button>
                        ) : (
                          <button
                            onClick={() => generateToken(reqId)}
                            disabled={generating !== null}
                            className="btn-secondary text-xs py-2 px-3 disabled:opacity-50"
                          >
                            {generating === reqId ? "Deriving Share..." : hasExpiredToken ? "Renew Ephemeral Token" : "Generate Token"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SHAMIR THRESHOLD MODE */}
      {tripleKeyMode && (
        <div className="card-clean p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Shamir 3-of-3 Threshold Reconstruction</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Combines Citizen Device Share + Law Enforcement Share + Platform Escrow Share to derive the master AES-256 cipher key.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "1. Citizen Share", status: citizenKeyPreview ? "Retrieved" : "Pending", ready: !!citizenKeyPreview },
              { label: "2. Government Share", status: "Verified Active", ready: true },
              { label: "3. Escrow Share", status: "Verified Active", ready: true },
            ].map((share) => (
              <div key={share.label} className="p-3.5 rounded bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
                <span className="text-xs font-semibold text-zinc-200">{share.label}</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${share.ready ? "bg-emerald-500" : "bg-zinc-600"}`} />
                  <span className="text-[11px] font-mono text-zinc-400">{share.status}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Select Approved Docket Case</label>
              <select
                value={selectedRequestId}
                onChange={(e) => {
                  setSelectedRequestId(e.target.value);
                  setCitizenKeyPreview("");
                  setError("");
                }}
                className="input-clean"
              >
                <option value="">&mdash; Choose authorized case docket &mdash;</option>
                {approvedRequests.map((req, i) => {
                  const target = req.targetUserId as Record<string, string> | null;
                  return (
                    <option key={i} value={(req._id || req.id) as string}>
                      Case #{req.caseNumber as string} ({target?.name || "Citizen"})
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedRequestId && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-300">Citizen Device Share Fragment</span>
                  <button
                    onClick={() => fetchCitizenKey(selectedRequestId)}
                    disabled={fetchingKey}
                    className="btn-secondary text-xs py-1 px-3"
                  >
                    {fetchingKey ? "Retrieving Share..." : "Extract Citizen Share"}
                  </button>
                </div>
                {citizenKeyPreview ? (
                  <div className="p-3 rounded bg-zinc-900 border border-zinc-800 font-mono text-xs text-emerald-400 break-all">
                    {citizenKeyPreview.substring(0, 48)}...
                  </div>
                ) : (
                  <div className="p-3 rounded bg-zinc-900/40 border border-zinc-800/80 text-xs text-zinc-500">
                    Extract citizen share token to unlock master cryptographic threshold.
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={performTripleKeyAccess}
            disabled={!selectedRequestId || !citizenKeyPreview || performingTripleKey}
            className="btn-primary w-full py-2.5 text-xs font-semibold disabled:opacity-50"
          >
            {performingTripleKey ? "Reconstructing Threshold & Decrypting..." : "Execute Threshold Reconstruction"}
          </button>
        </div>
      )}

      {/* DECRYPTED DATA DISPLAY */}
      {displayData && (
        <div className="card-clean overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-900/40">
            <div>
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Decrypted Telemetry Coordinates</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Case: #{displayData.caseNumber as string} &bull; Target: {displayData.targetUser as string}
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
              {tripleKeyData ? "Shamir Reconstruction" : "Token Stream"}
            </span>
          </div>

          {packets.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No decrypted telemetry coordinates found for this citizen
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-[11px] font-medium text-zinc-400 uppercase tracking-wider bg-zinc-900/20 sticky top-0">
                    <th className="py-3 px-5">Packet ID</th>
                    <th className="py-3 px-5 font-mono">Latitude</th>
                    <th className="py-3 px-5 font-mono">Longitude</th>
                    <th className="py-3 px-5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {packets.map((p, i) => {
                    const data = p.data as Record<string, unknown> | null;
                    return (
                      <tr key={i} className="hover:bg-zinc-900/40">
                        <td className="py-2.5 px-5 text-zinc-200">{p.packetId as string}</td>
                        <td className="py-2.5 px-5 text-zinc-400">{data?.latitude !== undefined ? String(data.latitude) : "—"}</td>
                        <td className="py-2.5 px-5 text-zinc-400">{data?.longitude !== undefined ? String(data.longitude) : "—"}</td>
                        <td className="py-2.5 px-5 text-zinc-500 font-sans">
                          {p.collectedAt ? new Date(p.collectedAt as string).toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
