"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  CreditCard,
  Search,
  Filter,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  Undo2
} from "lucide-react";

export default function PaymentsAudit() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [refundSuccess, setRefundSuccess] = useState("");

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await api.getTransactions(search, status);
      setTransactions(data);
      if (data.length > 0 && !selectedTx) {
        setSelectedTx(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadTransactions();
  };

  const handleSelectTx = (tx: any) => {
    setSelectedTx(tx);
    setRefundAmount("");
    setRefundReason("");
    setRefundError("");
    setRefundSuccess("");
  };

  const executeManualRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    setSubmittingRefund(true);
    setRefundError("");
    setRefundSuccess("");

    try {
      const amount = parseFloat(refundAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid positive amount.");
      }
      
      const res = await api.triggerRefund(selectedTx.payment_id, amount, refundReason);
      setRefundSuccess(`Refund successfully processed! Refund ID: ${res.refund_id}`);
      
      // Reload details and list
      loadTransactions();
      setSelectedTx((prev: any | null) =>
        prev ? { ...prev, status: "Refunded" } : null
      );
    } catch (err: any) {
      setRefundError(err.message || "Failed to execute manual refund.");
    } finally {
      setSubmittingRefund(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Payment Ledger</h2>
        <p className="text-slate-400 text-sm mt-1">
          Investigate gateways, review settlement status, and trigger authorized refund overrides.
        </p>
      </div>

      {/* Filter and Content panel split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane: Ledger Table */}
        <div className="lg:col-span-8 space-y-4 flex flex-col h-[70vh]">
          {/* Filter Bar */}
          <form onSubmit={handleSearch} className="flex gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                <Search className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition"
                placeholder="Search payment ID or merchant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <select
                className="bg-slate-950 border border-slate-850 rounded-xl py-2.5 pl-3 pr-8 text-sm text-slate-300 focus:outline-none focus:border-violet-650 transition cursor-pointer"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Success">Success</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-600/10 transition"
            >
              Filter
            </button>
          </form>

          {/* Transactions List */}
          <div className="flex-1 glass-panel border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/30 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                      <th className="px-6 py-3.5">Payment ID</th>
                      <th className="px-6 py-3.5">Customer</th>
                      <th className="px-6 py-3.5">Merchant</th>
                      <th className="px-6 py-3.5">Amount</th>
                      <th className="px-6 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        onClick={() => handleSelectTx(tx)}
                        className={`cursor-pointer transition-colors ${
                          selectedTx?.id === tx.id ? "bg-violet-600/10 hover:bg-violet-600/15" : "hover:bg-slate-900/30"
                        }`}
                      >
                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-200">{tx.payment_id}</td>
                        <td className="px-6 py-4 text-slate-300">{tx.customer_name}</td>
                        <td className="px-6 py-4 text-slate-400">{tx.merchant}</td>
                        <td className="px-6 py-4 font-semibold text-slate-200">₹{tx.amount.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            tx.status === "Success" ? "bg-emerald-500/10 text-emerald-400" :
                            tx.status === "Refunded" ? "bg-violet-500/10 text-violet-400" :
                            tx.status === "Pending" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"
                          }`}>
                            <span className={`h-1 w-1 rounded-full ${
                              tx.status === "Success" ? "bg-emerald-400" :
                              tx.status === "Refunded" ? "bg-violet-400" :
                              tx.status === "Pending" ? "bg-amber-400" : "bg-rose-400"
                            }`} />
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-500 text-xs">
                          No transactions found matching the filter query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Transaction Audit panel */}
        <div className="lg:col-span-4 glass-panel border border-slate-800 rounded-2xl p-6 flex flex-col justify-between h-[70vh] overflow-y-auto">
          {selectedTx ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Transaction File</span>
                    <h3 className="text-lg font-bold text-slate-200 font-mono mt-0.5">{selectedTx.payment_id}</h3>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                    selectedTx.status === "Success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    selectedTx.status === "Refunded" ? "bg-violet-500/10 text-violet-400 border-violet-500/20" :
                    selectedTx.status === "Pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                    "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}>
                    {selectedTx.status}
                  </span>
                </div>

                {/* Info List */}
                <div className="space-y-3.5 py-4 border-t border-b border-slate-800">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Customer:</span>
                    <span className="font-bold text-slate-200">{selectedTx.customer_name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Merchant Account:</span>
                    <span className="font-bold text-slate-200">{selectedTx.merchant}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Capture Amount:</span>
                    <span className="font-bold text-slate-200">₹{selectedTx.amount.toLocaleString()} ({selectedTx.currency})</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Authorized At:</span>
                    <span className="font-semibold text-slate-300">{new Date(selectedTx.created_at).toLocaleString()}</span>
                  </div>
                  {selectedTx.description && (
                    <div className="text-xs mt-3 pt-3 border-t border-slate-850 text-slate-400">
                      <span className="block font-bold text-slate-300 mb-1">Details:</span>
                      {selectedTx.description}
                    </div>
                  )}
                </div>

                {/* Interactive visual timeline */}
                <div className="mt-5">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase mb-3.5 tracking-wider">Gateway Lifecycle</span>
                  <div className="space-y-4 pl-3.5 border-l border-slate-800 text-xs relative">
                    <div className="relative">
                      <span className="absolute -left-[20px] top-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-bold text-slate-300">Payment Initiated</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">Authorization request dispatched to card issuer networks</span>
                    </div>
                    <div className="relative">
                      <span className={`absolute -left-[20px] top-0.5 h-2 w-2 rounded-full ${
                        selectedTx.status === "Failed" ? "bg-rose-500" : "bg-emerald-500"
                      }`} />
                      <span className="font-bold text-slate-300">Capture Call Response</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        {selectedTx.status === "Failed" ? "Issuer network returned: Insufficient Funds error." : "Vault authorization cleared; settlement approved."}
                      </span>
                    </div>
                    {selectedTx.status === "Refunded" && (
                      <div className="relative">
                        <span className="absolute -left-[20px] top-0.5 h-2 w-2 rounded-full bg-violet-500" />
                        <span className="font-bold text-violet-400">Transaction Refunded</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">Original funds released and returned to user bank</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Refund Form Area (requires manager authorization) */}
              {selectedTx.status !== "Refunded" && selectedTx.status !== "Failed" && (
                <div className="mt-6 pt-5 border-t border-slate-800">
                  <span className="block text-xs font-extrabold text-violet-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                    <Undo2 className="h-4 w-4" />
                    <span>Manager Refund Override</span>
                  </span>
                  
                  {refundError && <p className="text-[11px] text-rose-400 font-semibold mb-3">{refundError}</p>}
                  {refundSuccess && <p className="text-[11px] text-emerald-400 font-semibold mb-3">{refundSuccess}</p>}

                  <form onSubmit={executeManualRefund} className="space-y-3">
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        required
                        className="w-full bg-slate-900 border border-slate-850 px-3 py-2 rounded-xl text-xs placeholder-slate-500 focus:outline-none focus:border-violet-650"
                        placeholder={`Refund amount (Max: ₹${selectedTx.amount})`}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <textarea
                        required
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-850 px-3 py-2 rounded-xl text-xs placeholder-slate-500 focus:outline-none focus:border-violet-650 resize-none"
                        placeholder="Resolution justification for audit log..."
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingRefund}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-violet-600 hover:bg-violet-750 text-white font-bold text-xs rounded-xl shadow-lg transition"
                    >
                      {submittingRefund ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Processing Payout...</span>
                        </>
                      ) : (
                        <span>Confirm Refund Payout</span>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-slate-500 text-xs">
              Select a payment ledger row to audit lifecycle data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
