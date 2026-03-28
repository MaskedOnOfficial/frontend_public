import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { getApiErrorMessage } from "../lib/errors";
import { ensureBackendAwake } from "../lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wakingUp, setWakingUp] = useState(false);

  useEffect(() => {
    // Start warming the backend as soon as the login page opens.
    void ensureBackendAwake(45000).catch(() => {
      // Ignore here; submit flow handles user-visible retry states.
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && !error.response) {
        setWakingUp(true);
        setError("Server is waking up. Retrying sign-in in a moment...");
        try {
          await ensureBackendAwake();
          await login(email, password);
          navigate("/", { replace: true });
          return;
        } catch (retryError: unknown) {
          setError(getApiErrorMessage(retryError, "Server is still waking up. Please try again in a few seconds."));
        } finally {
          setWakingUp(false);
        }
      } else {
        setError(getApiErrorMessage(error, "Login failed. Please check your credentials."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-ambient min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md relative z-10 fade-rise">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 select-none">🎭</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            mask<span className="brand-gradient-text">On</span>
          </h1>
          <p className="text-text-muted text-sm mt-2">
            Curated social moments for unforgettable house parties.
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-3xl p-8">
          <h2 className="text-xl font-bold text-text mb-1">Welcome back</h2>
          <p className="text-text-muted text-sm mb-7">Sign in to view your trusted circle and latest party updates.</p>

          {/* Error */}
          {error && (
            <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 mb-6 text-error text-sm flex items-start gap-2">
              <span className="mt-0.5 text-base leading-none">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-luxe w-full rounded-xl px-4 py-3 text-sm"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="input-luxe w-full rounded-xl px-4 py-3 pr-12 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition text-lg leading-none"
                  tabIndex={-1}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary-luxe relative w-full overflow-hidden font-bold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {wakingUp ? "Waking server..." : "Signing in..."}
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Register link */}
        <p className="text-text-muted text-sm text-center mt-6">
          New here?{" "}
          <Link
            to="/auth/register"
            className="text-primary font-semibold hover:text-primary-hover transition"
          >
            Create an account →
          </Link>
        </p>
      </div>
    </div>
  );
}
