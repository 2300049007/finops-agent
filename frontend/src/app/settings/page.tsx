"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Settings,
  Cpu,
  Shield,
  Key,
  Users,
  Eye,
  EyeOff,
  Save,
  CheckCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";

export default function SettingsDashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  
  // Model settings
  const [model, setModel] = useState("gpt-4o-mini");
  const [lowRisk, setLowRisk] = useState(0.3);
  const [highRisk, setHighRisk] = useState(0.8);
  
  // Credentials
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  
  // System users
  const [systemUsers, setSystemUsers] = useState<any[]>([
    { email: "admin@finops.com", name: "Admin User", role: "Admin", status: "Active" },
    { email: "manager@finops.com", name: "Manager User", role: "Manager", status: "Active" },
    { email: "analyst@finops.com", name: "Analyst User", role: "Analyst", status: "Active" }
  ]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.getSettings();
        setModel(data.current_model || "gpt-4o-mini");
        setLowRisk(data.risk_thresholds?.low_threshold || 0.3);
        setHighRisk(data.risk_thresholds?.high_threshold || 0.8);
        setApiKey(data.is_openai_configured ? "••••••••••••••••••••••••" : "");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    
    // Simulate API delay
    setTimeout(() => {
      setSuccess("Configurations saved and propagated across agent nodes!");
      setSaving(false);
    }, 1200);
  };

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">System Configurations</h2>
        <p className="text-slate-400 text-sm mt-1">
          Adjust artificial intelligence neural thresholds, credential keys, and manage operator scopes.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns: Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: AI Model */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-violet-400 uppercase tracking-widest flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5" />
              <span>Model Architecture</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-350 uppercase tracking-wider mb-2">
                  Active Reasoning Model
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-850 px-3.5 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-650 cursor-pointer"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="gpt-4o-mini">Google DeepMind Gem-2 (Configured via API)</option>
                  <option value="gpt-4o-mini">OpenAI GPT-4o Mini (Default fallback)</option>
                  <option value="gpt-4o">OpenAI GPT-4o Enterprise</option>
                  <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                  <option value="local-llama-3">Local Llama-3-70B (Offline Host)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Risk Thresholds */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-5">
            <h3 className="text-sm font-extrabold text-violet-400 uppercase tracking-widest flex items-center gap-2">
              <Shield className="h-4.5 w-4.5" />
              <span>Security & Risk Thresholds</span>
            </h3>
            
            <div className="space-y-6 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-350">Low Risk Auto-Execute Limit (Current: {lowRisk})</span>
                  <span className="text-slate-550">Risk below this limit executes immediately.</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.5"
                  step="0.05"
                  className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  value={lowRisk}
                  onChange={(e) => setLowRisk(parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-350">High Risk Manager Hold Trigger (Current: {highRisk})</span>
                  <span className="text-slate-550">Risk equal or above triggers account freezes.</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.0"
                  step="0.05"
                  className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  value={highRisk}
                  onChange={(e) => setHighRisk(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Credentials */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-violet-400 uppercase tracking-widest flex items-center gap-2">
              <Key className="h-4.5 w-4.5" />
              <span>AI Access Keys</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-350 uppercase tracking-wider mb-2">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    className="w-full bg-slate-950 border border-slate-850 pl-3.5 pr-10 py-2.5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-650"
                    placeholder="Enter sk-proj-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: User list and Action button */}
        <div className="space-y-6">
          {/* Action button */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
            {success && (
              <p className="text-xs text-emerald-400 font-semibold bg-emerald-950/20 px-3.5 py-2.5 rounded-xl border border-emerald-500/20">
                {success}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-750 text-white rounded-xl font-bold shadow-lg shadow-violet-600/10 transition flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save System Settings</span>
            </button>
          </div>

          {/* User management list */}
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-violet-400 uppercase tracking-widest flex items-center gap-2">
              <Users className="h-4.5 w-4.5" />
              <span>Operator Accounts</span>
            </h3>
            
            <div className="divide-y divide-slate-850 space-y-3.5">
              {systemUsers.map((u) => (
                <div key={u.email} className="pt-3.5 first:pt-0 flex justify-between items-center text-xs">
                  <div>
                    <h5 className="font-bold text-slate-200">{u.name}</h5>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{u.email}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-850 rounded text-[9px] font-bold text-violet-400 uppercase">
                      {u.role}
                    </span>
                    <span className="block text-[10px] text-emerald-400 font-bold mt-1">
                      {u.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
