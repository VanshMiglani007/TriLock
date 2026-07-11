"use client";

import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/auth";

interface Packet {
  packetId: string;
  hash: string;
  metadata: { collectedAt: string; packetSize: number };
  createdAt: string;
}

interface IntegrityResult {
  integrityValid: boolean;
  totalPackets: number;
  issueCount: number;
  issues: Array<{ packetId: string; issue: string }>;
}

export default function VaultPage() {
  const { apiFetch } = useApi();
  const [packets, setPackets] = useState<Packet[]>([]);
  const [vault, setVault] = useState<{ packetCount: number; status: string; encryptionStatus: string; lastPacketAt: string } | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      const [vaultRes, packetsRes] = await Promise.allSettled([
        apiFetch("/vault"),
        apiFetch(`/vault/packets?page=${page}&limit=15`),
      ]);
      if (vaultRes.status === "fulfilled") {
        setVault((vaultRes.value as { vault: { packetCount: number; status: string; encryptionStatus: string; lastPacketAt: string } }).vault || null);
      }
      if (packetsRes.status === "fulfilled") {
        const val = packetsRes.value as { packets?: Packet[]; pagination?: { pages?: number } };
        setPackets(val.packets || []);
        setTotalPages(val.pagination?.pages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const checkIntegrity = async () => {
    setCheckingIntegrity(true);
    try {
      const data = await apiFetch("/vault/integrity") as IntegrityResult;
      setIntegrity(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingIntegrity(false);
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
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Encrypted Data Vault</h1>
        <p className="text-zinc-400 text-xs mt-1">Inspect stored telemetry packets and run cryptographic hash audits</p>
      </div>

      {/* Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Vault State</span>
          <span className="text-lg font-semibold text-zinc-100 mt-1 capitalize block">{vault?.status || "Active"}</span>
        </div>
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Cipher Standard</span>
          <span className="text-lg font-mono font-semibold text-zinc-100 mt-1 block">{vault?.encryptionStatus || "AES-256-GCM"}</span>
        </div>
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Total Telemetry</span>
          <span className="text-lg font-mono font-semibold text-zinc-100 mt-1 block">{vault?.packetCount || 0} packets</span>
        </div>
        <div className="card-clean p-4">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">Latest Capture</span>
          <span className="text-xs font-mono text-zinc-300 mt-2 block">
            {vault?.lastPacketAt ? new Date(vault.lastPacketAt).toLocaleString() : "No packets captured"}
          </span>
        </div>
      </div>

      {/* SHA-256 Integrity Runner */}
      <div className="card-clean p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">SHA-256 Ledger Audit</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Recomputes and verifies the checksum signature of every stored packet against the immutable chain.
            </p>
          </div>
          <button
            onClick={checkIntegrity}
            disabled={checkingIntegrity}
            className="btn-secondary text-xs shrink-0 py-2 px-3"
          >
            {checkingIntegrity ? "Computing Hashes..." : "Run Integrity Audit"}
          </button>
        </div>

        {integrity && (
          <div className={`mt-4 p-4 rounded-md border text-xs ${
            integrity.integrityValid
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}>
            <div className="font-semibold flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${integrity.integrityValid ? "bg-emerald-500" : "bg-red-500"}`} />
              {integrity.integrityValid
                ? `Passed — All ${integrity.totalPackets} stored packets matched their cryptographic SHA-256 digests.`
                : `INTEGRITY VIOLATION — ${integrity.issueCount} packets failed checksum.`}
            </div>
            {integrity.issues.length > 0 && (
              <div className="mt-2.5 space-y-1 font-mono text-[11px]">
                {integrity.issues.map((issue, i) => (
                  <div key={i} className="p-1.5 bg-red-950/40 rounded border border-red-800/50">
                    {issue.packetId}: {issue.issue}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Packet Table */}
      <div className="card-clean overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 flex justify-between items-center">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Encrypted Telemetry Ledger</h3>
          <span className="text-xs font-mono text-zinc-500">{vault?.packetCount || 0} packets</span>
        </div>

        {packets.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No telemetry packets stored in vault
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-[11px] font-medium text-zinc-400 uppercase tracking-wider bg-zinc-900/30">
                    <th className="py-3 px-5">Packet ID</th>
                    <th className="py-3 px-5">SHA-256 Checksum</th>
                    <th className="py-3 px-5">Size</th>
                    <th className="py-3 px-5">Captured At</th>
                    <th className="py-3 px-5 text-right">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {packets.map((pkt, i) => (
                    <tr key={i} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-5 font-mono font-medium text-zinc-200">{pkt.packetId}</td>
                      <td className="py-3 px-5 font-mono text-zinc-500 max-w-[200px] truncate" title={pkt.hash}>
                        {pkt.hash?.substring(0, 24)}...
                      </td>
                      <td className="py-3 px-5 text-zinc-400">
                        {pkt.metadata?.packetSize ? `${pkt.metadata.packetSize}B` : "64B"}
                      </td>
                      <td className="py-3 px-5 text-zinc-400">
                        {pkt.metadata?.collectedAt ? new Date(pkt.metadata.collectedAt).toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          AES-256 Encrypted
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary py-1 px-3 text-xs disabled:opacity-50"
                >
                  &larr; Previous
                </button>
                <span className="text-zinc-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary py-1 px-3 text-xs disabled:opacity-50"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
