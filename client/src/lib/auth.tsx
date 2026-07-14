"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "government" | "verifier" | "admin";
  department?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: string;
  department?: string;
  badgeNumber?: string;
  phoneNumber?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("trilock_token");
    const savedUser = localStorage.getItem("trilock_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Login failed");
    }

    setToken(data.data.token);
    setUser(data.data.user);
    localStorage.setItem("trilock_token", data.data.token);
    localStorage.setItem("trilock_user", JSON.stringify(data.data.user));
  }, []);

  const register = useCallback(async (regData: RegisterData) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regData),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Registration failed");
    }

    setToken(data.data.token);
    setUser(data.data.user);
    localStorage.setItem("trilock_token", data.data.token);
    localStorage.setItem("trilock_user", JSON.stringify(data.data.user));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("trilock_token");
    localStorage.removeItem("trilock_user");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// API helper with auth headers
export function useApi() {
  const { token } = useAuth();

  const apiFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Don't set Content-Type for FormData
      if (options.body instanceof FormData) {
        delete headers["Content-Type"];
      }

      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (${res.status}): ${res.statusText}`);
      }

      if (!data.success) {
        throw new Error((data.error as string) || `Request failed (${res.status})`);
      }

      return data.data;
    },
    [token]
  );

  return { apiFetch };
}
