"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Activity,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Cpu,
  User as UserIcon,
  CheckCircle,
  AlertTriangle,
  XOctagon,
  Search,
  Loader2
} from "lucide-react";

export default function AuditLogsDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  useEffect(() => {
    loadLogs();
  }, [category]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(category);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    // Standard trigger for browser downloading CSV
    const url = api.exportAuditLogsUrl();
    window.open(url, "_blank");
  };

  const toggleExpandLog = (id: number) => {
    setExpandedLog(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Immutable Audit Ledger</h2>
          <p className="text-slate-400 text-sm mt-1">
            Browse and export trace records of all AI agent classifications, gateway operations, and manager overrides.
          </p>
        </div>
        
        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shrink-0"
        >
          <Download className="h-4 w-4 text-violet-400" />
          <span>Export CSV Ledger</span>
        </button>
      </div>

      {/* Filter and Content panel */}
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
          <Filter className="h-4.5 w-4.5 text-slate-500 ml-2" />
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Filter Category:</span>
          
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "All Logs", value: "" },
              { label: "Support Nodes", value: "Support" },
              { label: "Payments Engine", value: "Payment" },
              { label: "Fraud Check", value: "Fraud" },
              { label: "System Events", value: "System" }
            ].map((tab) => (
              <button
                key={tab.label}
                onClick={() => setCategory(tab.value)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  category === tab.value
                    ? "bg-violet-600/20 text-violet-400 border border-violet-500/20"
                    : "bg-slate-950 border border-slate-900 text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/30 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4 w-10"></th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Action Event</th>
                    <th className="px-6 py-4">Operator</th>
                    <th className="px-6 py-4">Confidence</th>
                    <th className="px-6 py-4">Execution Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {logs.map((log) => {
                    const isExpanded = expandedLog === log.id;
                    const timestampStr = new Date(log.timestamp).toLocaleString();
                    const isAi = log.user_id === "AI Agent" || log.user_id === "System";
                    
                    return (
                      <React.Fragment key={log.id}>
                        {/* Summary Row */}
                        <tr
                          onClick={() => toggleExpandLog(log.id)}
                          className="hover:bg-slate-900/30 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 text-center">
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-400 font-mono">{timestampStr}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.category === "Support" ? "bg-blue-500/10 text-blue-400" :
                              log.category === "Payment" ? "bg-violet-500/10 text-violet-400" :
                              log.category === "Fraud" ? "bg-rose-500/10 text-rose-400" : "bg-slate-850 text-slate-400"
                            }`}>
                              {log.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-200 max-w-sm truncate">{log.action}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-xs text-slate-350">
                              {isAi ? (
                                <>
                                  <Cpu className="h-3.5 w-3.5 text-violet-400" />
                                  <span>{log.user_id}</span>
                                </>
                              ) : (
                                <>
                                  <UserIcon className="h-3.5 w-3.5 text-slate-450" />
                                  <span className="truncate max-w-[120px]">{log.user_id}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {log.confidence ? (
                              <span className="font-semibold text-slate-300 font-mono text-xs">
                                {Math.round(log.confidence * 100)}%
                              </span>
                            ) : (
                              <span className="text-slate-600 font-mono text-xs">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                              log.execution_status === "Success" ? "text-emerald-400" :
                              log.execution_status === "Paused" ? "text-amber-400" : "text-rose-400"
                            }`}>
                              {log.execution_status === "Success" ? <CheckCircle className="h-4 w-4" /> :
                               log.execution_status === "Paused" ? <AlertTriangle className="h-4 w-4" /> : <XOctagon className="h-4 w-4" />}
                              <span>{log.execution_status}</span>
                            </span>
                          </td>
                        </tr>

                        {/* Details/Payload expanded row */}
                        {isExpanded && (
                          <tr className="bg-slate-950/40">
                            <td colSpan={7} className="px-10 py-5 border-t border-b border-slate-900">
                              <div className="space-y-4 text-xs">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Left Details block */}
                                  <div>
                                    <span className="block text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-wider">Event Details</span>
                                    <p className="text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-850">
                                      {log.details || "No details provided."}
                                    </p>
                                  </div>
                                  
                                  {/* Right Reason block */}
                                  <div>
                                    <span className="block text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-wider">AI Reasoning Justification</span>
                                    <p className="text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-850">
                                      {log.reason || "No reasoning logged."}
                                    </p>
                                  </div>
                                </div>

                                {/* Code blocks payloads */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                  <div>
                                    <span className="block text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-wider">Request Payload</span>
                                    <pre className="bg-slate-950 border border-slate-900 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-40 text-violet-300">
                                      {JSON.stringify(log.request_payload || {"empty": true}, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <span className="block text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-wider">Response Payload</span>
                                    <pre className="bg-slate-950 border border-slate-900 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-40 text-emerald-300">
                                      {JSON.stringify(log.response_payload || {"empty": true}, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-550">
                        No audit traces identified.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
