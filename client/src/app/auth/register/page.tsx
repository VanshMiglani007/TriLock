"use client";

import { useState, Suspense } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

function RegisterForm() {

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phoneNumber: form.phoneNumber || undefined,
      });
      router.push("/dashboard/user");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-zinc-800">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center flex flex-col items-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-xs tracking-tighter shadow-sm">
              TL
            </div>
            <span className="font-semibold tracking-tight text-zinc-100 text-base">
              TriLock Core
            </span>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Create workspace clearance</h1>
          <p className="text-xs text-zinc-400 mt-1">Select your role and initialize your cryptographic identity</p>
        </div>

        {/* Form Card */}
        <div className="card-clean p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* Account type — always Citizen on public registration */}
            <div className="p-3 rounded-md bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 text-xs font-bold shrink-0">C</div>
              <div>
                <div className="text-xs font-semibold text-zinc-200">Citizen Portal</div>
                <div className="text-[10px] text-zinc-500">Data privacy &amp; audit monitoring — only citizens can self-register</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Full Name</label>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                className="input-clean"
                placeholder="Jane Doe"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Address</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input-clean"
                placeholder="name@trilock.gov"
                required
              />
            </div>

            {/* Phone Number - optional, for AI voice notifications */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Phone Number
                <span className="text-zinc-500 font-normal ml-1">(optional — for data access alerts)</span>
              </label>
              <input
                name="phoneNumber"
                type="tel"
                value={form.phoneNumber}
                onChange={handleChange}
                className="input-clean"
                placeholder="+91 98765 43210"
                autoComplete="tel"
              />
              <p className="text-[10px] text-zinc-600 mt-1">
                If provided, you will receive an AI voice call when your data is accessed under court order.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input-clean"
                  placeholder="Min. 6 chars"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Confirm</label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="input-clean"
                  placeholder="Repeat"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm font-semibold mt-2 disabled:opacity-50"
            >
              {loading ? "Registering identity..." : "Initialize Account"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-zinc-800/80 text-center text-xs text-zinc-400">
            Already have clearance?{" "}
            <Link href="/auth/login" className="text-zinc-200 hover:text-white font-medium underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-xs text-zinc-500 font-mono">
          Loading Registration...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
