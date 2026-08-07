"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  MessageSquare,
  Search,
  User as UserIcon,
  ShieldAlert,
  Coins,
  Send,
  Loader2,
  FileText,
  Clock,
  Sparkles,
  Play,
  CheckCircle,
  FileCode,
  FileDown
} from "lucide-react";

export default function SupportWorkspace() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketDetails, setTicketDetails] = useState<any | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfLink, setPdfLink] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "timeline" | "policy">("chat");

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const data = await api.getTickets();
      setTickets(data);
      if (data.length > 0 && !selectedTicket) {
        handleSelectTicket(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    setTicketDetails(null);
    setPdfLink("");
    setOcrStatus("");
    try {
      const details = await api.getTicketDetails(ticket.id);
      setTicketDetails(details);
    } catch (err) {
      console.error(err);
    }
  };

  const runAgentWorkflow = async () => {
    if (!selectedTicket) return;
    setProcessing(true);
    try {
      await api.processTicket(selectedTicket.id);
      // Reload ticket details
      const details = await api.getTicketDetails(selectedTicket.id);
      setTicketDetails(details);
      // Reload list
      loadTickets();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleTriggerOcr = async () => {
    if (!ticketDetails?.ticket?.customer_id) return;
    setOcrLoading(true);
    setOcrStatus("OCR document reading scheduled...");
    try {
      await api.triggerKycOcr(ticketDetails.ticket.customer_id);
      setOcrStatus("OCR verify active. Background status: Running...");
      setTimeout(async () => {
        const details = await api.getTicketDetails(selectedTicket.id);
        setTicketDetails(details);
        setOcrStatus("OCR completed. Customer KYC status updated!");
      }, 3000);
    } catch (err) {
      setOcrStatus("OCR scheduling failed.");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!selectedTicket) return;
    setPdfLoading(true);
    try {
      const res = await api.triggerPdfReport(selectedTicket.id);
      setPdfLink(`http://localhost:8000/static/reports/Investigation_Report_Ticket_${selectedTicket.id}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  const filteredTickets = tickets.filter(t =>
    t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.customer?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[85vh]">
      {/* Left Column: Tickets List */}
      <div className="lg:col-span-4 glass-panel rounded-2xl border border-slate-800 flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b border-slate-800 bg-slate-900/35">
          <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
            <MessageSquare className="h-4.5 w-4.5 text-violet-400" />
            <span>Support Tickets</span>
          </h3>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition-all"
              placeholder="Search by ticket or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {filteredTickets.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelectTicket(t)}
              className={`w-full text-left p-4 transition-colors ${
                selectedTicket?.id === t.id
                  ? "bg-violet-600/10 border-l-2 border-violet-500"
                  : "hover:bg-slate-900/40"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">#{t.id}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  t.status === "Open" ? "bg-blue-500/15 text-blue-400" : "bg-emerald-500/15 text-emerald-400"
                }`}>
                  {t.status}
                </span>
              </div>
              <h4 className="font-bold text-xs text-slate-200 truncate">{t.subject}</h4>
              <p className="text-[11px] text-slate-400 truncate mt-1">{t.customer?.name || "Unknown Customer"}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-semibold ${
                  t.priority === "High" || t.priority === "Urgent" ? "bg-rose-500/15 text-rose-400" : "bg-slate-800 text-slate-400"
                }`}>
                  {t.priority}
                </span>
                {t.sentiment && (
                  <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-semibold ${
                    t.sentiment === "Angry" ? "bg-amber-500/15 text-amber-400" : "bg-violet-500/15 text-violet-400"
                  }`}>
                    {t.sentiment}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Column: Ticket workspace */}
      <div className="lg:col-span-8 glass-panel rounded-2xl border border-slate-800 flex flex-col overflow-hidden h-full">
        {selectedTicket && ticketDetails ? (
          <>
            {/* Header info */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/35 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-extrabold text-lg text-slate-200 leading-none">{ticketDetails.ticket.subject}</h3>
                  <span className={`px-2.5 py-1 bg-violet-600/10 text-violet-400 rounded-lg text-xs font-semibold border border-violet-500/20`}>
                    #{ticketDetails.ticket.id}
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-2 mt-1.5">
                  <UserIcon className="h-4 w-4 text-slate-500" />
                  <span>{ticketDetails.ticket.customer_name} ({ticketDetails.ticket.customer_email})</span>
                  <span className="text-slate-600">|</span>
                  <span className={`font-bold ${
                    ticketDetails.ticket.customer_status === "Active" ? "text-emerald-400" : "text-rose-400"
                  }`}>Account: {ticketDetails.ticket.customer_status}</span>
                </p>
              </div>

              {/* Action operations buttons */}
              <div className="flex gap-2">
                <button
                  onClick={runAgentWorkflow}
                  disabled={processing || ticketDetails.ticket.status === "Closed"}
                  className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-50 disabled:hover:bg-violet-600 transition"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>AI Routing Graph Active...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-white" />
                      <span>Deploy AI Agent</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sub-tabs header */}
            <div className="flex border-b border-slate-800 bg-slate-950/20">
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === "chat" ? "border-violet-500 text-violet-400" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Agent Console
              </button>
              <button
                onClick={() => setActiveTab("timeline")}
                className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === "timeline" ? "border-violet-500 text-violet-400" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Graph Audit Trail ({ticketDetails.audit_logs.length})
              </button>
            </div>

            {/* Active view component */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === "chat" && (
                <div className="space-y-6">
                  {/* Customer message bubble */}
                  <div className="flex gap-4 items-start max-w-2xl">
                    <div className="bg-slate-800 border border-slate-700 h-9 w-9 rounded-xl flex items-center justify-center text-slate-300 font-bold shrink-0">
                      C
                    </div>
                    <div className="bg-slate-900 border border-slate-800/80 px-4 py-3.5 rounded-2xl rounded-tl-none">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Customer Query</p>
                      <p className="text-sm text-slate-200 leading-relaxed">{ticketDetails.ticket.description}</p>
                      <span className="text-[10px] text-slate-500 block mt-2 text-right">
                        {new Date(ticketDetails.ticket.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* AI Agent Analysis Details */}
                  {ticketDetails.ticket.sentiment && (
                    <div className="bg-slate-950/50 border border-slate-800/80 p-5 rounded-2xl max-w-2xl">
                      <h4 className="text-xs font-extrabold text-violet-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4" />
                        <span>AI Intent & Entity Profiling</span>
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/40">
                          <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Parsed Intent</span>
                          <span className="text-xs font-bold text-slate-200">{ticketDetails.ticket.sentiment ? "Refund/Support Inquiry" : "N/A"}</span>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/40">
                          <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Customer Sentiment</span>
                          <span className="text-xs font-bold text-amber-400">{ticketDetails.ticket.sentiment}</span>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/40">
                          <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">KYC Check Status</span>
                          <span className="text-xs font-bold text-blue-400">KYC Status Loaded</span>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/40">
                          <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Risk Evaluation</span>
                          <span className="text-xs font-bold text-rose-400">Evaluated</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Operational Controls Tools */}
                  <div className="bg-slate-900/20 border border-slate-800/80 p-5 rounded-2xl max-w-2xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Asynchronous Operational Actions
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleTriggerOcr}
                        disabled={ocrLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800/80 text-xs font-bold rounded-xl border border-slate-800 text-slate-300 transition"
                      >
                        {ocrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode className="h-4 w-4 text-violet-400" />}
                        <span>Trigger KYC OCR Parser</span>
                      </button>
                      <button
                        onClick={handleGeneratePdf}
                        disabled={pdfLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800/80 text-xs font-bold rounded-xl border border-slate-800 text-slate-300 transition"
                      >
                        {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-violet-400" />}
                        <span>Compile PDF Case File</span>
                      </button>
                    </div>
                    {ocrStatus && (
                      <p className="text-xs text-violet-400 font-semibold bg-violet-950/20 px-3 py-2 rounded-lg border border-violet-500/20">
                        {ocrStatus}
                      </p>
                    )}
                    {pdfLink && (
                      <div className="mt-3">
                        <a
                          href={pdfLink}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold uppercase hover:text-emerald-300 transition"
                        >
                          <FileDown className="h-4 w-4" />
                          <span>Download Generated Case PDF</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "timeline" && (
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-slate-300">LangGraph Agent Trajectory</h4>
                  <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-8">
                    {ticketDetails.audit_logs.map((log: any, index: number) => (
                      <div key={log.id} className="relative">
                        {/* Dot indicator */}
                        <span className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 ${
                          log.execution_status === "Success" ? "bg-emerald-500 border-emerald-500" : "bg-amber-500 border-amber-500"
                        }`} />
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                            {log.category} Node • {log.timestamp.split("T")[1].slice(0, 8)} UTC
                          </span>
                          <h5 className="text-sm font-bold text-slate-200 mt-1">{log.action}</h5>
                          <p className="text-xs text-slate-400 mt-1.5 bg-slate-900/50 p-3 rounded-xl border border-slate-800/40 leading-relaxed max-w-xl">
                            {log.details}
                          </p>
                          {log.reason && (
                            <span className="block text-[11px] text-violet-400 font-semibold mt-2">
                              Reason: {log.reason} (Confidence: {log.confidence ? `${Math.round(log.confidence * 100)}%` : "N/A"})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {ticketDetails.audit_logs.length === 0 && (
                      <div className="text-center py-6 text-slate-500 text-xs pl-0">
                        <Clock className="h-6 w-6 text-slate-600 mx-auto mb-2" />
                        <span>No trace history. Run "Deploy AI Agent" to execute.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center max-w-sm">
              <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <h4 className="font-bold text-slate-300">Select a Ticket</h4>
              <p className="text-slate-500 text-xs mt-1">
                Choose an incoming support case file on the left panel to begin analysis and run autonomous agents.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
