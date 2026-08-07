"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  CreditCard,
  ShieldAlert,
  CheckSquare,
  Activity,
  Settings,
  LogOut,
  User as UserIcon,
  Zap
} from "lucide-react";
import { api } from "@/lib/api";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ full_name: string; role: string; email: string } | null>(null);

  useEffect(() => {
    const currentUser = api.getUser();
    if (currentUser) {
      setUser(currentUser);
    } else {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    api.logout();
    router.push("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Customer Support", href: "/support", icon: MessageSquare },
    { name: "Payments Audit", href: "/payments", icon: CreditCard },
    { name: "Fraud Center", href: "/fraud", icon: ShieldAlert },
    { name: "Manager Approval", href: "/approvals", icon: CheckSquare, badge: true },
    { name: "Audit Logs", href: "/audit", icon: Activity },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-800 h-screen fixed top-0 left-0 flex flex-col justify-between z-20">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="bg-violet-600 p-2.5 rounded-xl shadow-lg shadow-violet-600/30 flex items-center justify-center animate-pulse-slow">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg leading-none text-white tracking-wide">
              FINOPS AGENT
            </h1>
            <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">
              Enterprise Operations
            </span>
          </div>
        </div>

        {/* Navigation Options */}
        <nav className="px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400 group-hover:text-violet-400 transition-colors"}`} />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Section / Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        {user && (
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="bg-slate-800 h-10 w-10 rounded-xl flex items-center justify-center border border-slate-700">
              <UserIcon className="h-5 w-5 text-slate-300" />
            </div>
            <div className="overflow-hidden">
              <h4 className="font-bold text-sm text-slate-200 truncate">{user.full_name}</h4>
              <span className="text-xs text-violet-400 font-semibold uppercase">{user.role}</span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout System</span>
        </button>
      </div>
    </aside>
  );
}
