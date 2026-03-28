import { useState, useEffect, type ReactNode } from "react";
import axios from "axios";
import api from "../lib/api";
import { ensureBackendAwake } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { AuthContext } from "./auth-context-base";
import type { User } from "../types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const tokenOnLoad = localStorage.getItem("access_token");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(tokenOnLoad));

  // On mount, try to load user if we have a token
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      return;
    }

    const bootstrapAuth = async () => {
      try {
        const res = await api.get("/users/me");
        setUser(res.data.data.user);
        return;
      } catch (error) {
        if (axios.isAxiosError(error) && !error.response) {
          try {
            await ensureBackendAwake(65000);
            const retryRes = await api.get("/users/me");
            setUser(retryRes.data.data.user);
            return;
          } catch (retryError) {
            console.error("Failed to bootstrap auth user:", getApiErrorMessage(retryError, "Unknown auth error"));
          }
        } else {
          console.error("Failed to bootstrap auth user:", getApiErrorMessage(error, "Unknown auth error"));
        }
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      } finally {
        setLoading(false);
      }
    };

    void bootstrapAuth();
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
    } catch (error) {
      console.error("Logout request failed:", getApiErrorMessage(error, "Unknown logout error"));
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  }

  async function refreshUser() {
    try {
      const res = await api.get("/users/me");
      setUser(res.data.data.user);
    } catch (error) {
      console.error("Failed to refresh user:", getApiErrorMessage(error, "Unknown refresh error"));
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
