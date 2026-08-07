"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Network,
  Users,
  Activity,
  History,
  FileSearch,
  Loader2
} from "lucide-react";

export default function FraudCenter() {
const [cases, setCases] = useState<any[]>([]);
const [selectedCase, setSelectedCase] = useState<any | null>(null);

const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("FraudHold");
  const [status, setStatus] = useState("Resolved");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await api.getFraudCases();
      setCases(data);
      if (data.length > 0 && !selectedCase) {
        setSelectedCase(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCase = (c: any) => {
    setSelectedCase(c);
    setSuccessMsg("");
    setErrorMsg("");
  };

  const submitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    setSubmittingAction(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      await api.resolveFraudCase(selectedCase.id, status, action);
      setSuccessMsg("Fraud investigation case resolved successfully!");
      loadCases();
      setSelectedCase((prev: any) =>
        prev ? { ...prev, status } : null
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resolve fraud case.");
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Fraud Investigation Center</h2>
          <p className="text-slate-400 text-sm mt-1">
            Review machine learning risk indicators, inspect account topology, and apply security controls.
          </p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane: Case Inbox */}
        <div className="lg:col-span-4 glass-panel border border-slate-800 rounded-2xl flex flex-col h-[75vh] overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/35">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-violet-400" />
              <span>Fraud Watch Alerts</span>
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              </div>
            ) : (
              cases.map((c) => {
                const isHighRisk = c.risk_score >= 0.8;
                const isMediumRisk = c.risk_score >= 0.4 && c.risk_score < 0.8;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCase(c)}
                    className={`w-full text-left p-4 transition-colors ${
                      selectedCase?.id === c.id ? "bg-violet-600/10 border-l-2 border-violet-500" : "hover:bg-slate-900/30"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ALERT #{c.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.status === "Pending" ? "bg-amber-500/15 text-amber-400" : "bg-slate-800 text-slate-400"
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-200 truncate mt-1">
                      Transaction: {c.transaction?.payment_id || "Unknown"}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Customer: {c.transaction?.customer || "N/A"}
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-slate-500">Value: ₹{c.transaction?.amount?.toLocaleString()}</span>
                      <span className={`text-xs font-extrabold ${
                        isHighRisk ? "text-rose-400" : isMediumRisk ? "text-amber-400" : "text-emerald-400"
                      }`}>
                        Risk: {Math.round(c.risk_score * 100)}%
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Investigation File */}
        <div className="lg:col-span-8 glass-panel border border-slate-800 rounded-2xl p-6 h-[75vh] overflow-y-auto flex flex-col justify-between">
          {selectedCase ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                {/* Header title */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Active Investigation</span>
                    <h3 className="text-lg font-bold text-slate-200 mt-0.5">
                      Tx: {selectedCase.transaction?.payment_id}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">AI Risk Index</span>
                    <span className={`text-xl font-black ${
                      selectedCase.risk_score >= 0.8 ? "text-rose-400 animate-pulse" : "text-amber-400"
                    }`}>
                      {Math.round(selectedCase.risk_score * 100)}% Risk
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left subcolumn: Details and evidence */}
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <FileSearch className="h-4.5 w-4.5 text-violet-400" />
                        <span>Security Evidence Trail</span>
                      </h4>
                      <ul className="space-y-2 text-xs">
                        {selectedCase.evidence && selectedCase.evidence.map((ev: string, idx: number) => (
                          <li key={idx} className="flex gap-2.5 items-start bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/40 text-slate-350 leading-relaxed">
                            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <History className="h-4.5 w-4.5 text-violet-400" />
                        <span>Agent Case Rationale</span>
                      </h4>
                      <p className="text-xs text-slate-400 bg-slate-900/40 p-3.5 rounded-xl border border-slate-850 leading-relaxed">
                        {selectedCase.reasoning}
                      </p>
                    </div>
                  </div>

                  {/* Right subcolumn: Transaction Network Topology Graph */}
                  <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <Network className="h-4.5 w-4.5 text-violet-400" />
                      <span>Ledger Connection Network</span>
                    </h4>
                    
                    {/* SVG Graph Topology representation */}
                    <div className="flex-1 min-h-[160px] flex items-center justify-center relative">
                      <svg className="w-full h-full max-h-[180px]" viewBox="0 0 300 150">
                        {/* Connecting lines */}
                        <line x1="50" y1="75" x2="150" y2="75" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="150" y1="75" x2="250" y2="75" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="150" y1="75" x2="250" y2="40" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="150" y1="75" x2="250" y2="110" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />

                        {/* Customer node */}
                        <circle cx="50" cy="75" r="14" fill="#1e1b4b" stroke="#8b5cf6" strokeWidth="1.5" />
                        <text x="50" y="79" fill="#a78bfa" fontSize="8" fontWeight="bold" textAnchor="middle">CUST</text>
                        <text x="50" y="99" fill="#94a3b8" fontSize="7" textAnchor="middle">Account Root</text>

                        {/* Transaction node */}
                        <circle cx="150" cy="75" r="18" fill="#180808" stroke="#ef4444" strokeWidth="2" className="animate-pulse" />
                        <text x="150" y="79" fill="#fca5a5" fontSize="8" fontWeight="bold" textAnchor="middle">TXN</text>
                        <text x="150" y="103" fill="#ef4444" fontSize="7" fontWeight="bold" textAnchor="middle">Score: {Math.round(selectedCase.risk_score * 100)}%</text>

                        {/* Merchant node */}
                        <circle cx="250" cy="40" r="12" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                        <text x="250" y="43" fill="#cbd5e1" fontSize="7" textAnchor="middle">MERCH</text>

                        {/* Banking node */}
                        <circle cx="250" cy="75" r="12" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                        <text x="250" y="78" fill="#cbd5e1" fontSize="7" textAnchor="middle">GATE</text>

                        {/* IP/Device node */}
                        <circle cx="250" cy="110" r="12" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                        <text x="250" y="113" fill="#cbd5e1" fontSize="7" textAnchor="middle">IP/DEV</text>
                      </svg>
                    </div>

                    <div className="text-[10px] text-slate-500 text-center mt-3 pt-3 border-t border-slate-900">
                      Topological trace of payment location, transaction hash, and device IP linkage.
                    </div>
                  </div>
                </div>
              </div>

              {/* Case resolution panel */}
              {selectedCase.status === "Pending" && (
                <div className="bg-slate-900/20 border border-slate-800 p-5 rounded-2xl mt-6">
                  <span className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
                    Incident Response & Action Resolution
                  </span>
                  
                  {successMsg && <p className="text-xs text-emerald-400 font-semibold mb-3">{successMsg}</p>}
                  {errorMsg && <p className="text-xs text-rose-400 font-semibold mb-3">{errorMsg}</p>}

                  <form onSubmit={submitResolution} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                        Mitigation action proposed
                      </label>
                      <select
                        className="w-full bg-slate-950 border border-slate-850 px-3 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-650 cursor-pointer"
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                      >
                        <option value="FraudHold">Place Fraud Hold (Hold Funds)</option>
                        <option value="AccountFreeze">Freeze Customer Account</option>
                        <option value="AccountBlock">Block Customer Account (Restrict permanently)</option>
                        <option value="Release">Release Flags (No action / Dismiss)</option>
                      </select>
                    </div>

                    <div className="w-full md:w-44">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                        Case status resolution
                      </label>
                      <select
                        className="w-full bg-slate-950 border border-slate-850 px-3 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-650 cursor-pointer"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="Resolved">Resolved (Complete)</option>
                        <option value="Dismissed">Dismissed (False Positive)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingAction}
                      className="w-full md:w-auto px-6 py-2.5 bg-violet-600 hover:bg-violet-750 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {submittingAction ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Applying Rule...</span>
                        </>
                      ) : (
                        <span>Apply Resolution</span>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-slate-500 text-xs">
              Select an active fraud alert file from the watch list to investigate
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
