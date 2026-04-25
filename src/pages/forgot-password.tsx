import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", { email });
      setSuccess(res.data?.data?.message || "If an account exists for that email, a reset link has been sent.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to submit password reset request."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-ambient min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md glass-panel rounded-3xl p-8"
      >
        <h1 className="text-2xl font-extrabold text-text mb-1">Forgot your password?</h1>
        <p className="text-text-muted text-sm mb-6">
          Enter your email and we will send you a secure reset link.
        </p>

        {error && (
          <div role="alert" aria-live="polite" className="bg-error/10 border border-error/25 text-error rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {success && (
          <div role="status" aria-live="polite" className="bg-success/10 border border-success/25 text-success rounded-xl px-4 py-3 text-sm mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-luxe w-full rounded-xl px-4 py-3.5 pr-10 text-sm"
                placeholder="you@example.com"
              />
              <Mail className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-text-dim" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="btn-primary-luxe w-full font-bold py-4 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Send Reset Link
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-text-muted text-sm text-center mt-6">
          Remembered it?{" "}
          <Link to="/auth/login" className="text-primary font-semibold hover:text-accent transition">
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
