import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "../lib/api";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to load user if we have a token
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      api
        .get("/users/me")
        .then((res) => setUser(res.data.data.user))
        .catch(() => {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    const { user: userData, tokens } = res.data.data;
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);
    setUser(userData);
  }

  async function register(email: string, username: string, password: string, displayName: string) {
    const res = await api.post("/auth/register", {
      email,
      username,
      password,
      display_name: displayName,
    });
    const { user: userData, tokens } = res.data.data;
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);
    setUser(userData);
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore errors — clear local state regardless
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  }

  async function refreshUser() {
    try {
      const res = await api.get("/users/me");
      setUser(res.data.data.user);
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
