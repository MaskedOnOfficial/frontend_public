import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { getApiErrorMessage } from "../lib/errors";
import { ensureBackendAwake } from "../lib/api";
import { motion } from "framer-motion";
import { Eye, EyeOff, Sparkles, ArrowRight, Loader2 } from "lucide-react";

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
    void ensureBackendAwake(45000).catch(() => {});
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
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-accent to-hot shadow-2xl shadow-primary/30 mb-5"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="text-text">mask</span>
            <span className="brand-gradient-text">On</span>
          </h1>
          <p className="text-text-muted text-sm mt-3 max-w-xs mx-auto leading-relaxed">
            Where curated connections meet unforgettable nightlife.
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-3xl p-8">
          <h2 className="text-xl font-bold text-text mb-1">Welcome back</h2>
          <p className="text-text-muted text-sm mb-7">Sign in to your trusted circle.</p>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 mb-6 text-error text-sm flex items-start gap-2"
            >
              <span className="mt-0.5">⚠️</span>
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-luxe w-full rounded-xl px-4 py-3.5 text-sm"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
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
                  className="input-luxe w-full rounded-xl px-4 py-3.5 pr-12 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !email.trim() || !password.trim()}
              className="btn-primary-luxe relative w-full overflow-hidden font-bold py-4 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-3 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {wakingUp ? "Waking server..." : "Signing in..."}
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Register link */}
        <p className="text-text-muted text-sm text-center mt-8">
          New to maskOn?{" "}
          <Link
            to="/auth/register"
            className="text-primary font-semibold hover:text-accent transition inline-flex items-center gap-1"
          >
            Create an account
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
