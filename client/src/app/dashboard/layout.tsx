"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

// Crisp SVG Icons replacing cartoonish emojis
const icons = {
  dashboard: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  vault: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  keys: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  transparency: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  request: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  emergency: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  analytics: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

type IconKey = keyof typeof icons;

const navItems: Record<string, { label: string; href: string; iconKey: IconKey }[]> = {
  user: [
    { label: "Overview", href: "/dashboard/user", iconKey: "dashboard" },
    { label: "Data Vault", href: "/dashboard/user/vault", iconKey: "vault" },
    { label: "Encryption Keys", href: "/dashboard/user/keys", iconKey: "keys" },
    { label: "Audit Trail", href: "/dashboard/user/transparency", iconKey: "transparency" },
  ],
  government: [
    { label: "Overview", href: "/dashboard/government", iconKey: "dashboard" },
    { label: "New Warrant Request", href: "/dashboard/government/request", iconKey: "request" },
    { label: "Emergency Break-Glass", href: "/dashboard/government/emergency", iconKey: "emergency" },
  ],
  verifier: [
    { label: "Warrant Queue", href: "/dashboard/verifier", iconKey: "dashboard" },
  ],
  admin: [
    { label: "System Health", href: "/dashboard/admin", iconKey: "dashboard" },
    { label: "Trust & Metrics", href: "/dashboard/analytics", iconKey: "analytics" },
  ],
};

const roleLabels: Record<string, { label: string; colorClass: string }> = {
  user: { label: "Citizen Portal", colorClass: "bg-zinc-800 text-zinc-300 border-zinc-700" },
  government: { label: "Officer Portal", colorClass: "bg-indigo-950/40 text-indigo-300 border-indigo-800/60" },
  verifier: { label: "Judicial Verifier", colorClass: "bg-emerald-950/40 text-emerald-300 border-emerald-800/60" },
  admin: { label: "System Admin", colorClass: "bg-amber-950/40 text-amber-300 border-amber-800/60" },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Auth guard: redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [loading, isAuthenticated, router]);

  // RBAC: redirect users accessing portals outside their role
  useEffect(() => {
    if (!loading && user) {
      const roleHomeRoutes: Record<string, string> = {
        user: "/dashboard/user",
        government: "/dashboard/government",
        verifier: "/dashboard/verifier",
        admin: "/dashboard/admin",
      };
      const rolePrefix: Record<string, string[]> = {
        user: ["/dashboard/user"],
        government: ["/dashboard/government"],
        verifier: ["/dashboard/verifier"],
        admin: ["/dashboard/admin", "/dashboard/analytics"],
      };
      const allowedPrefixes = rolePrefix[user.role] || [];
      const isAllowed = allowedPrefixes.some((prefix) => pathname.startsWith(prefix));
      if (!isAllowed) {
        router.replace(roleHomeRoutes[user.role] || "/dashboard/user");
      }
    }
  }, [loading, user, pathname, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-500 text-xs font-mono">Initializing Workspace...</span>
        </div>
      </div>
    );
  }

  const items = navItems[user.role] || [];
  const badgeInfo = roleLabels[user.role] || { label: user.role, colorClass: "bg-zinc-800 text-zinc-300 border-zinc-700" };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#0e0e11] border-r border-zinc-800/80 flex flex-col fixed h-screen z-20">
        {/* Workspace Brand */}
        <div className="px-6 py-5 border-b border-zinc-800/80 flex flex-col gap-2">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-6 h-6 rounded bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-xs tracking-tighter">
              TL
            </div>
            <span className="font-semibold tracking-tight text-zinc-100 group-hover:text-white transition-colors">
              TriLock Core
            </span>
          </Link>
          <div>
            <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded border ${badgeInfo.colorClass}`}>
              {badgeInfo.label}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-h-0">
          <div className="px-3 pb-2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Menu
          </div>
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
                  isActive
                    ? "bg-zinc-800/90 text-zinc-100 font-medium shadow-sm border border-zinc-700/50"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                }`}
              >
                <span className={isActive ? "text-zinc-100" : "text-zinc-500"}>
                  {icons[item.iconKey]}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Footer Area */}
        <div className="p-4 border-t border-zinc-800/80 bg-[#0c0c0e]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-200 truncate">{user.name}</div>
              <div className="text-xs text-zinc-500 truncate">{user.email}</div>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push("/"); }}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium py-2 rounded-md transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 ml-64 p-8 min-w-0">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
