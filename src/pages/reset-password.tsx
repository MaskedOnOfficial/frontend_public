import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabaseAuth } from "../lib/supabase-auth";
import { getApiErrorMessage } from "../lib/errors";

function parseHashParams(): URLSearchParams {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash);
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function bootstrapRecoverySession() {
      setError("");
      const hashParams = parseHashParams();
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      try {
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabaseAuth.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else if (tokenHash && type === "recovery") {
          const { error: otpError } = await supabaseAuth.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (otpError) throw otpError;
        } else {
          throw new Error("Invalid or expired password reset link.");
        }
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, "Could not validate password reset link."));
      } finally {
        setLoadingSession(false);
      }
    }

    void bootstrapRecoverySession();
  }, [searchParams]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError("Password must include uppercase, lowercase, and a number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabaseAuth.auth.updateUser({ password });
      if (updateError) throw updateError;

      setMessage("Password updated successfully. Redirecting to login...");
      await supabaseAuth.auth.signOut();
      window.setTimeout(() => {
        navigate("/auth/login", {
          replace: true,
          state: { notice: "Password reset complete. Please sign in with your new password." },
        });
      }, 900);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not reset password."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-ambient min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8">
        <h1 className="text-xl font-bold text-text mb-2">Create a new password</h1>
        <p className="text-text-muted text-sm mb-6">This will update your account password immediately.</p>

        {message && <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 text-primary text-sm mb-4">{message}</div>}
        {error && <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm mb-4">{error}</div>}

        {loadingSession ? (
          <p className="text-text-muted text-sm">Validating reset link...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-luxe w-full rounded-xl px-4 py-3.5 text-sm"
                minLength={8}
                maxLength={128}
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-luxe w-full rounded-xl px-4 py-3.5 text-sm"
                minLength={8}
                maxLength={128}
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary-luxe w-full font-bold py-3.5 rounded-xl disabled:opacity-60"
            >
              {submitting ? "Updating..." : "Update password"}
            </button>
          </form>
        )}

        <div className="mt-6 text-sm text-text-muted">
          <Link to="/auth/login" className="text-primary hover:text-accent transition">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
