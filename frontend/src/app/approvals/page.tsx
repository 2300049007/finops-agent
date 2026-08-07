"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  CheckSquare,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  AlertOctagon,
  Coins,
  ShieldCheck,
  ChevronDown,
  Loader2,
  FileCode
} from "lucide-react";

export default function HumanApprovalQueue() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState<{ [key: number]: string }>({});
  const [actionLoading, setActionLoading] = useState<{ [key: number]: string | null }>({});
  const [activeView, setActiveView] = useState<"pending" | "processed">("pending");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await api.getApprovalRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (requestId: number, decision: "Approved" | "Rejected") => {
    const reason = reasons[requestId] || "";
    if (!reason && decision === "Rejected") {
      alert("A reasoning explanation is required to decline requests.");
      return;
    }
    
    setActionLoading(prev => ({ ...prev, [requestId]: decision }));
    try {
      await api.actionApprovalRequest(requestId, decision, reason);
      // Reload queue
      loadRequests();
    } catch (err: any) {
      alert(err.message || "Failed to process approval action");
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: null }));
    }
  };

  const handleReasonChange = (requestId: number, value: string) => {
    setReasons(prev => ({ ...prev, [requestId]: value }));
  };

  const pendingRequests = requests.filter(r => r.status === "Pending");
  const processedRequests = requests.filter(r => r.status !== "Pending");
  const activeList = activeView === "pending" ? pendingRequests : processedRequests;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Authorization Operations</h2>
        <p className="text-slate-400 text-sm mt-1">
          Review agent holds and execute dual-authorization reviews on high-risk workflows.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveView("pending")}
          className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeView === "pending" ? "border-violet-500 text-violet-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="h-4.5 w-4.5" />
          <span>Pending Holds ({pendingRequests.length})</span>
        </button>
        <button
          onClick={() => setActiveView("processed")}
          className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeView === "processed" ? "border-violet-500 text-violet-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <CheckCircle className="h-4.5 w-4.5" />
          <span>Completed Approvals ({processedRequests.length})</span>
        </button>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : (
        <div className="space-y-5">
          {activeList.map((req) => {
            const isPending = req.status === "Pending";
            const isApproved = req.status === "Approved";
            const details = req.details || {};
            
            return (
              <div
                key={req.id}
                className={`glass-panel rounded-2xl border p-6 space-y-5 transition-all duration-300 ${
                  isPending 
                    ? "border-amber-500/20 bg-amber-500/[0.02]" 
                    : isApproved ? "border-emerald-500/20 bg-emerald-500/[0.01]" : "border-slate-800"
                }`}
              >
                {/* Upper header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      isPending ? "bg-amber-500/10 text-amber-400" : isApproved ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                    }`}>
                      {req.action_type === "Refund" ? <Coins className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-200 text-base leading-none">
                          Authorize Proposed {req.action_type}
                        </h4>
                        <span className="text-[10px] bg-slate-900 border border-slate-850 px-2 py-0.5 rounded font-mono text-slate-400">
                          REQ #{req.id}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 mt-1 block">
                        Raised by {req.requested_by} • {new Date(req.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      isPending ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      isApproved ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        isPending ? "bg-amber-400 animate-pulse" : isApproved ? "bg-emerald-400" : "bg-rose-400"
                      }`} />
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Target Resource ID</span>
                    <span className="font-mono text-xs font-bold text-slate-350">{req.target_id}</span>
                  </div>
                  
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Customer Profile</span>
                    <span className="font-bold text-slate-350">{details.customer_name || "Unknown"} (ID: {details.customer_id || "N/A"})</span>
                  </div>

                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Risk Justification</span>
                    <span className="text-slate-300 font-medium">{details.reason || "Action proposed on high-risk limits."}</span>
                  </div>

                  {req.action_type === "Refund" && details.amount && (
                    <div className="md:col-span-3 bg-slate-900/30 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-400">Total Payout Proposed:</span>
                      <span className="text-lg font-black text-violet-400">₹{details.amount.toLocaleString()} INR</span>
                    </div>
                  )}
                </div>

                {/* Action Form for Pending, or archival info */}
                {isPending ? (
                  <div className="pt-4 border-t border-slate-800/60 flex flex-col gap-4">
                    <div className="w-full">
                      <textarea
                        className="w-full bg-slate-950 border border-slate-850 px-4 py-3 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-650 resize-none"
                        rows={2}
                        placeholder="Provide credential response and authorization reasoning justification..."
                        value={reasons[req.id] || ""}
                        onChange={(e) => handleReasonChange(req.id, e.target.value)}
                      />
                    </div>
                    
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => handleDecision(req.id, "Rejected")}
                        disabled={actionLoading[req.id] !== null && actionLoading[req.id] !== undefined}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 rounded-xl text-xs font-bold transition"
                      >
                        {actionLoading[req.id] === "Rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4.5 w-4.5" />}
                        <span>Decline Action</span>
                      </button>
                      <button
                        onClick={() => handleDecision(req.id, "Approved")}
                        disabled={actionLoading[req.id] !== null && actionLoading[req.id] !== undefined}
                        className="flex items-center gap-1.5 px-6 py-2.5 bg-violet-600 hover:bg-violet-750 text-white rounded-xl text-xs font-bold shadow-lg transition"
                      >
                        {actionLoading[req.id] === "Approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4.5 w-4.5" />}
                        <span>Authorize Release</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-slate-800/60 text-xs flex justify-between items-center text-slate-500 bg-slate-900/10 p-3 rounded-xl">
                    <span>
                      Reviewed by: <strong className="text-slate-400">{req.approved_by || "System"}</strong>
                    </span>
                    {req.reason && (
                      <span className="italic">
                        Reason: "{req.reason}"
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {activeList.length === 0 && (
            <div className="text-center py-16 glass-panel border border-slate-800 rounded-2xl">
              <CheckCircle className="h-12 w-12 text-slate-700 mx-auto mb-3" />
              <h4 className="font-bold text-slate-300">Approval Queue Clean</h4>
              <p className="text-slate-550 text-xs mt-1">
                No authorization requests match this queue criteria.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
