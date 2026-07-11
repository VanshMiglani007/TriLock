"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filledDemo, setFilledDemo] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin(email, password);
  };

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setError("");
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      const userData = JSON.parse(localStorage.getItem("trilock_user") || "{}");
      const routes: Record<string, string> = {
        user: "/dashboard/user",
        government: "/dashboard/government",
        verifier: "/dashboard/verifier",
        admin: "/dashboard/admin",
      };
      router.push(routes[userData.role] || "/dashboard/user");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // Fill the login form with demo credentials — user still clicks Login themselves
  const fillDemo = (demoEmail: string, demoPassword: string, label: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFilledDemo(label);
    setError("");
  };

  const demoAccounts = [
    { email: "citizen@trilock.demo", password: "citizen123", role: "Citizen Portal" },
    { email: "officer@trilock.demo", password: "officer123", role: "Officer Portal" },
    { email: "reviewer1@trilock.demo", password: "reviewer123", role: "Judicial Reviewer" },
    { email: "admin@trilock.demo", password: "admin123", role: "System Admin" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-zinc-800">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="mb-8 text-center flex flex-col items-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-xs tracking-tighter shadow-sm">
              TL
            </div>
            <span className="font-semibold tracking-tight text-zinc-100 text-base">
              TriLock Core
            </span>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Sign in to workspace</h1>
          <p className="text-xs text-zinc-400 mt-1">Enter your credentials to access your portal</p>
        </div>

        {/* Form Card */}
        <div className="card-clean p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            {filledDemo && (
              <div className="p-2.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>
                  <span className="font-medium">{filledDemo}</span> credentials loaded — click Continue to sign in
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFilledDemo(""); }}
                className="input-clean"
                placeholder="name@trilock.gov"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFilledDemo(""); }}
                className="input-clean"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Continue"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-zinc-800/80 text-center text-xs text-zinc-400">
            Need an authorized clearance?{" "}
            <Link href="/auth/register" className="text-zinc-200 hover:text-white font-medium underline">
              Create account
            </Link>
          </div>
        </div>

        {/* Demo Shortcuts — fills fields only, user presses Continue themselves */}
        <div className="mt-6">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider text-center mb-2.5">
            Quick Demo Fill
          </div>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => fillDemo(acc.email, acc.password, acc.role)}
                disabled={loading}
                className={`border py-2 px-2.5 rounded-md text-xs font-medium transition-all text-left truncate flex items-center justify-between group disabled:opacity-50 ${
                  filledDemo === acc.role
                    ? "bg-zinc-800 border-zinc-600 text-zinc-100"
                    : "bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800/80 text-zinc-300 hover:text-white"
                }`}
              >
                <span className="truncate">{acc.role}</span>
                <span
                  className={`${
                    filledDemo === acc.role
                      ? "text-emerald-400"
                      : "text-zinc-600 group-hover:text-zinc-400"
                  }`}
                >
                  {filledDemo === acc.role ? "✓" : "→"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
