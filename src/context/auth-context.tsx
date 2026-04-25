import { useState, useEffect, type ReactNode } from "react";
import axios from "axios";
import api, { clearStoredAuthTokens, ensureBackendAwake, persistAuthTokens } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { AuthContext } from "./auth-context-base";
import type { AuthTokens, User } from "../types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, attempt to bootstrap the authenticated user via cookie auth.
  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      try {
        const res = await api.get("/users/me");
        if (!cancelled) setUser(res.data.data.user);
        return;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          if (!cancelled) setUser(null);
          return;
        }

        if (axios.isAxiosError(error) && !error.response) {
          try {
            await ensureBackendAwake(65000);
            const retryRes = await api.get("/users/me");
            if (!cancelled) setUser(retryRes.data.data.user);
            return;
          } catch (retryError) {
            console.error("Failed to bootstrap auth user:", getApiErrorMessage(retryError, "Unknown auth error"));
          }
        } else {
          console.error("Failed to bootstrap auth user:", getApiErrorMessage(error, "Unknown auth error"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    const { user: userData } = res.data.data;
    const tokens = res.data?.data?.tokens as AuthTokens | undefined;
    if (tokens) persistAuthTokens(tokens);
    setUser(userData);
  }

  async function register(email: string, username: string, password: string, displayName: string, mobileNumber: string) {
    const res = await api.post("/auth/register", {
      email,
      mobile_number: mobileNumber,
      username,
      password,
      display_name: displayName,
    });

    const userData = res.data?.data?.user as User | undefined;
    const tokens = res.data?.data?.tokens as AuthTokens | undefined;
    if (tokens) {
      persistAuthTokens(tokens);
      setUser(userData ?? null);
    } else {
      clearStoredAuthTokens();
      setUser(null);
    }

    return {
      requiresVerification: !userData,
      message:
        typeof res.data?.data?.message === "string" ? res.data.data.message : undefined,
      verification: res.data?.data?.verification,
    };
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout request failed:", getApiErrorMessage(error, "Unknown logout error"));
    }
    clearStoredAuthTokens();
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
