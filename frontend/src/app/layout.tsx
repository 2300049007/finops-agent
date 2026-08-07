"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("finops_token") : null;
    if (!token && !isLoginPage) {
      router.push("/login");
    } else if (token) {
      setAuthenticated(true);
    }
  }, [pathname, isLoginPage, router]);

  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        {isLoginPage ? (
          children
        ) : (
          <div className="flex min-h-screen">
            {/* Sidebar component */}
            <Sidebar />
            
            {/* Main view content */}
            <div className="flex-1 pl-64 transition-all duration-300">
              <main className="p-8 max-w-7xl mx-auto">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
