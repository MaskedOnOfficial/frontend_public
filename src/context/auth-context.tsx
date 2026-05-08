import { useState, useEffect, type ReactNode } from "react";
import axios from "axios";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import api, { clearStoredAuthTokens, ensureBackendAwake, getStoredRefreshToken, persistAuthTokens } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { AuthContext } from "./auth-context-base";
import type { AuthTokens, User } from "../types";
import { resetPushNotifications } from "../lib/push-notifications";

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
          // The interceptor already attempted a token refresh. It only clears stored
          // tokens when the server explicitly rejects them (401/403). If tokens are
          // still present it means the refresh failed transiently (network error,
          // backend cold start, 5xx) — don't log the user out. They'll auto-recover
          // on the next request once the backend is reachable.
          if (!getStoredRefreshToken()) {
            if (!cancelled) setUser(null);
          }
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

  // On native (Capacitor): re-validate auth every time the app comes back to foreground.
  // The API interceptor handles token refresh automatically on 401, so a stale access
  // token is transparently renewed here without the user noticing.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: Awaited<ReturnType<typeof CapApp.addListener>> | null = null;

    CapApp.addListener("appStateChange", async ({ isActive }) => {
      if (!isActive) return;
      try {
        const res = await api.get("/users/me");
        setUser(res.data.data.user);
      } catch {
        // Interceptor already attempted refresh; if this still fails the session
        // has genuinely expired (e.g. user signed in elsewhere) — leave state as-is
        // so the next user action will surface the proper 401 redirect.
      }
    }).then((h) => {
      handle = h;
    });

    return () => {
      handle?.remove();
    };
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    const { user: userData } = res.data.data;
    const tokens = res.data?.data?.tokens as AuthTokens | undefined;
    if (tokens) persistAuthTokens(tokens);
    setUser(userData);
  }

  async function register(
    email: string,
    username: string,
    password: string,
    displayName: string,
    acceptedTerms: boolean,
    acceptedPrivacy: boolean
  ) {
    await api.post("/auth/register", {
      email,
      username,
      password,
      display_name: displayName,
      accepted_terms: acceptedTerms,
      accepted_privacy: acceptedPrivacy,
    });

    clearStoredAuthTokens();
    setUser(null);
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout request failed:", getApiErrorMessage(error, "Unknown logout error"));
    }
    clearStoredAuthTokens();
    resetPushNotifications();
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
