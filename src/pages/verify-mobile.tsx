import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, Smartphone, RefreshCcw } from "lucide-react";
import api, { persistAuthTokens } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { useAuth } from "../context/auth-hook";
import type { AuthTokens } from "../types";
import type { PendingMobileVerification } from "../context/auth-context-base";

const STORAGE_KEY = "maskOn-pending-mobile-verification";

function readStoredVerification(): PendingMobileVerification | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingMobileVerification;
  } catch {
    return null;
  }
}

function writeStoredVerification(verification: PendingMobileVerification | null): void {
  try {
    if (!verification) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(verification));
  } catch {
    // Ignore sessionStorage failures.
  }
}

export default function VerifyMobilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    typeof location.state === "object" && location.state && "notice" in location.state && typeof location.state.notice === "string"
      ? location.state.notice
      : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const incomingVerification = useMemo(() => {
    if (typeof location.state === "object" && location.state && "verification" in location.state) {
      return (location.state as { verification?: PendingMobileVerification }).verification || null;
    }
    return null;
  }, [location.state]);

  const [verification, setVerification] = useState<PendingMobileVerification | null>(incomingVerification || readStoredVerification());

  useEffect(() => {
    if (incomingVerification) {
      setVerification(incomingVerification);
      writeStoredVerification(incomingVerification);
      if (incomingVerification.otp_code) {
        setOtp(incomingVerification.otp_code);
      }
    }
  }, [incomingVerification]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!verification?.user_id) {
      setError("Your verification session is missing. Please register again.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/auth/verify-mobile-otp", {
        user_id: verification.user_id,
        otp: otp.trim(),
      });
      const tokens = res.data?.data?.tokens as AuthTokens | undefined;
      if (tokens) {
        persistAuthTokens(tokens);
      }
      writeStoredVerification(null);
      await refreshUser();
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not verify your mobile number."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!verification?.user_id) {
      setError("Your verification session is missing. Please register again.");
      return;
    }

    setResending(true);
    setError("");
    try {
      const res = await api.post("/auth/resend-mobile-otp", {
        user_id: verification.user_id,
      });
      const nextVerification = res.data?.data?.verification as PendingMobileVerification | undefined;
      if (nextVerification) {
        setVerification(nextVerification);
        writeStoredVerification(nextVerification);
        if (nextVerification.otp_code) {
          setOtp(nextVerification.otp_code);
        }
      }
      if (typeof res.data?.data?.message === "string") {
        setNotice(res.data.data.message);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not resend OTP."));
    } finally {
      setResending(false);
    }
  }

  if (!verification?.user_id || !verification.mobile_number) {
    return (
      <div className="auth-ambient min-h-screen bg-bg flex items-center justify-center px-4 py-10">
        <div className="glass-panel rounded-3xl p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-text mb-3">Verification Session Missing</h1>
          <p className="text-text-muted text-sm mb-6">Register again to request a mobile OTP.</p>
          <Link to="/auth/register" className="btn-primary-luxe block rounded-xl py-3 font-bold">
            Back to Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-ambient min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-3xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-accent to-hot shadow-2xl shadow-primary/30 mx-auto mb-4 flex items-center justify-center">
            <Smartphone className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-text mb-2">Verify Mobile Number</h1>
          <p className="text-text-dim text-sm">
            Enter the 6-digit OTP sent to <span className="text-text font-semibold">{verification.mobile_number}</span>
          </p>
        </div>

        {notice && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4 text-primary text-sm">
            {notice}
          </div>
        )}

        {verification.otp_code && (
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 mb-4 text-warning text-sm">
            Temporary OTP fallback: <span className="font-bold tracking-[0.25em]">{verification.otp_code}</span>
          </div>
        )}

        {error && (
          <div className="bg-error/10 border border-error/20 rounded-xl p-3 mb-4 text-error text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
              One-Time Password
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="input-luxe w-full rounded-xl px-4 py-3.5 text-center tracking-[0.35em] text-lg"
              placeholder="123456"
              minLength={6}
              maxLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting || otp.trim().length !== 6}
            className="btn-primary-luxe w-full font-bold py-4 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Verify Mobile
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="btn-secondary-luxe w-full font-semibold py-3 rounded-xl mt-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          {resending ? "Generating OTP..." : "Resend OTP"}
        </button>

        <p className="text-text-muted text-sm text-center mt-6">
          Already verified? <Link to="/auth/login" className="text-primary font-semibold">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}