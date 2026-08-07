"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Lock, Mail, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCredentials = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-8 glass-panel rounded-2xl border border-slate-800 shadow-2xl relative z-10 mx-4">
        {/* Brand logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-violet-600 p-3.5 rounded-2xl shadow-xl shadow-violet-600/30 flex items-center justify-center mb-3">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h2 className="font-extrabold text-2xl tracking-tight text-white">
            AI Operations Console
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Sign in to start operational workflows
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-sm mb-6 font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              System Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <Mail className="h-4.5 w-4.5" />
              </span>
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition-all duration-200"
                placeholder="analyst@finops.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Security Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <Lock className="h-4.5 w-4.5" />
              </span>
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition-all duration-200"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-violet-600 text-white rounded-xl font-bold shadow-lg shadow-violet-600/20 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authorizing System Session...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Quick Credentials shortcuts */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <span className="block text-center text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">
            Quick Dev Shortcuts
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => fillQuickCredentials("analyst@finops.com", "analyst123")}
              className="py-2 px-1 text-[11px] font-bold text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:border-violet-500/40 hover:bg-slate-800/20 transition-all"
            >
              Analyst
            </button>
            <button
              onClick={() => fillQuickCredentials("manager@finops.com", "manager123")}
              className="py-2 px-1 text-[11px] font-bold text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:border-violet-500/40 hover:bg-slate-800/20 transition-all"
            >
              Manager
            </button>
            <button
              onClick={() => fillQuickCredentials("admin@finops.com", "admin123")}
              className="py-2 px-1 text-[11px] font-bold text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:border-violet-500/40 hover:bg-slate-800/20 transition-all"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
