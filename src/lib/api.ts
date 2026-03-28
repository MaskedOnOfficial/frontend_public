import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "/api/v1";
const healthUrl = `${apiBaseUrl}/health`;
let wakePromise: Promise<void> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Warm up sleeping backends (e.g. Render free tier) before user actions like login.
export async function ensureBackendAwake(maxWaitMs = 65000): Promise<void> {
  if (wakePromise) {
    return wakePromise;
  }

  wakePromise = (async () => {
    const startedAt = Date.now();
    let lastError: unknown;

    while (Date.now() - startedAt < maxWaitMs) {
      try {
        await axios.get(healthUrl, { timeout: 9000 });
        return;
      } catch (error) {
        lastError = error;
        await sleep(3000);
      }
    }

    throw lastError ?? new Error("Backend is taking too long to wake up");
  })();

  try {
    await wakePromise;
  } finally {
    wakePromise = null;
  }
}

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const res = await axios.post(`${apiBaseUrl}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: newRefresh } = res.data.data.tokens;
          localStorage.setItem("access_token", access_token);
          localStorage.setItem("refresh_token", newRefresh);
          original.headers.Authorization = `Bearer ${access_token}`;
          return api(original);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/auth/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
