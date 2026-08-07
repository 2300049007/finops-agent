"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  TrendingUp,
  ShieldAlert,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Activity,
  ArrowUpRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [fraudCases, setFraudCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const loadDashboardData = async () => {
      try {
        const [ticks, txs, apps, frauds] = await Promise.all([
          api.getTickets(),
          api.getTransactions(),
          api.getApprovalRequests(),
          api.getFraudCases()
        ]);
        setTickets(ticks);
        setTransactions(txs);
        setApprovals(apps);
        setFraudCases(frauds);
      } catch (err) {
        console.error("Error loading dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <span className="text-sm font-semibold text-slate-400">Loading Operational Workspace...</span>
        </div>
      </div>
    );
  }

  // Calculate live counters
  const openTickets = tickets.filter(t => t.status === "Open").length;
  const pendingApprovals = approvals.filter(a => a.status === "Pending").length;
  const activeFraudAlerts = fraudCases.filter(f => f.status === "Pending").length;
  const processedToday = tickets.length - openTickets;

  // Chart 1: Case Velocity Data (Mocked/Aggregated)
  const caseVelocityData = [
    { name: "08:00", received: 12, resolved: 8 },
    { name: "10:00", received: 34, resolved: 22 },
    { name: "12:00", received: 56, resolved: 41 },
    { name: "14:00", received: 88, resolved: 68 },
    { name: "16:00", received: 110, resolved: 95 },
    { name: "18:00", received: 134, resolved: 120 },
    { name: "20:00", received: 154, resolved: 142 }
  ];

  // Chart 2: Risk Profile Distribution
  const riskProfileData = [
    { name: "Low Risk (<0.3)", value: 720 },
    { name: "Medium Risk (0.3-0.79)", value: 210 },
    { name: "High Risk (>=0.8)", value: 70 }
  ];
  const COLORS = ["#10B981", "#F59E0B", "#EF4444"];

  // Chart 3: Agent Decisions Efficiency
  const agentEfficiencyData = [
    { category: "Support Route", auto: 84, manual: 16 },
    { category: "Refund Check", auto: 68, manual: 32 },
    { category: "Fraud Holds", auto: 92, manual: 8 },
    { category: "KYC OCR", auto: 95, manual: 5 }
  ];

  return (
    <div className="space-y-8">
      {/* Upper Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Operational Overview
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Real-time control board for autonomous financial support and risk mitigation.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl text-emerald-400 font-semibold text-xs uppercase tracking-wider animate-pulse-slow">
          <Activity className="h-4.5 w-4.5" />
          <span>AI AGENT STATUS: ACTIVE (99.6% CONFIDENCE)</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* KPI 1 */}
        <div className="glass-panel p-5 rounded-2xl glass-card-hover border border-slate-800">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Tickets</span>
            <div className="bg-blue-500/10 p-2 rounded-xl text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-white">{openTickets}</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Pending user responses</p>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel p-5 rounded-2xl glass-card-hover border border-slate-800">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Approvals</span>
            <div className="bg-amber-500/10 p-2 rounded-xl text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-white">{pendingApprovals}</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Requires manager review</p>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel p-5 rounded-2xl glass-card-hover border border-slate-800">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fraud Alerts</span>
            <div className="bg-rose-500/10 p-2 rounded-xl text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-white">{activeFraudAlerts}</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Flagged high-risk events</p>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel p-5 rounded-2xl glass-card-hover border border-slate-800">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolved Today</span>
            <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-white">{processedToday}</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Closed support cases</p>
        </div>

        {/* KPI 5 */}
        <div className="glass-panel p-5 rounded-2xl glass-card-hover border border-slate-800">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agent Health</span>
            <div className="bg-violet-500/10 p-2 rounded-xl text-violet-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-white">98.4%</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">OCR & Graph SLA online</p>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      {mounted && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Area Chart: Ingestion Velocity */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800">
            <h4 className="font-bold text-base text-slate-200 mb-5">Ingestion & Resolution Velocity</h4>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={caseVelocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155" }} />
                  <Area type="monotone" dataKey="received" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorRec)" name="Cases Received" />
                  <Area type="monotone" dataKey="resolved" stroke="#10B981" fillOpacity={1} fill="url(#colorRes)" name="Cases Resolved" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Risk distribution */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <h4 className="font-bold text-base text-slate-200 mb-4">Risk Distribution</h4>
            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskProfileData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {riskProfileData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Pie Chart Legend */}
            <div className="space-y-2 mt-4">
              {riskProfileData.map((item, idx) => (
                <div key={item.name} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                    <span className="text-slate-400 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-200">{item.value} txs</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart: AI Decision Ratios */}
          <div className="lg:col-span-3 glass-panel p-6 rounded-2xl border border-slate-800">
            <h4 className="font-bold text-base text-slate-200 mb-5">AI Decisive Coverage vs Manual Overrides</h4>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentEfficiencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="category" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155" }} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="auto" fill="#8B5CF6" name="AI Autonomous Execution (%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="manual" fill="#475569" name="Human Escalation (%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Manager Approval Preview Queue */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h4 className="font-bold text-base text-slate-200">Urgent Manager Approvals</h4>
            <p className="text-xs text-slate-400 mt-1">High-risk actions blocked pending credential approval</p>
          </div>
          <a
            href="/approvals"
            className="flex items-center gap-1.5 text-xs text-violet-400 font-bold uppercase tracking-wider hover:text-violet-300 transition-colors"
          >
            <span>Review Full Queue</span>
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3.5">Action Proposed</th>
                <th className="px-6 py-3.5">Target entity</th>
                <th className="px-6 py-3.5">Trigger Cause</th>
                <th className="px-6 py-3.5">Origin</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Date Blocked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {approvals.filter(a => a.status === "Pending").slice(0, 5).map((req) => (
                <tr key={req.id} className="hover:bg-slate-900/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-300">
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-lg text-xs font-semibold border border-amber-500/20">
                      {req.action_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">{req.target_id}</td>
                  <td className="px-6 py-4 text-slate-300 max-w-xs truncate">{req.details?.reason || "High value threshold flag."}</td>
                  <td className="px-6 py-4 text-slate-400">{req.requested_by}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>Manager Hold</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {approvals.filter(a => a.status === "Pending").length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 text-xs font-medium">
                    <CheckCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <span>No pending authorization hold requests in operations.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
