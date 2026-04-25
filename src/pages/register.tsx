import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { getApiErrorMessage } from "../lib/errors";
import { ensureBackendAwake } from "../lib/api";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2, User, AtSign, Mail, Lock, Smartphone } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wakingUp, setWakingUp] = useState(false);
  const mountedRef = useRef(true);
  const backendReadyRef = useRef(false);
  const wakePromiseRef = useRef<Promise<void> | null>(null);

  function ensureBackendReady(): Promise<void> {
    if (backendReadyRef.current) return Promise.resolve();
    if (!wakePromiseRef.current) {
      wakePromiseRef.current = ensureBackendAwake(45000)
        .then(() => {
          backendReadyRef.current = true;
        })
        .finally(() => {
          wakePromiseRef.current = null;
        });
    }
    return wakePromiseRef.current;
  }

  useEffect(() => {
    void ensureBackendReady().catch(() => {});
    return () => { mountedRef.current = false; };
  }, []);

  function getClientValidationError(): string | null {
    const trimmedDisplayName = displayName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const normalizedMobileNumber = mobileNumber.replace(/[^\d+]/g, "");

    if (!trimmedDisplayName) return "Display name is required";
    if (!trimmedUsername) return "Username is required";
    if (trimmedUsername.length < 3) return "Username must be at least 3 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return "Username can only contain letters, numbers, and underscores";
    }
    if (!trimmedEmail) return "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) return "Please enter a valid email";
    if (!normalizedMobileNumber) return "Mobile number is required";
    if (!/^\+?\d{10,15}$/.test(normalizedMobileNumber)) return "Please enter a valid mobile number";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return "Password must include uppercase, lowercase, and a number";
    }
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const clientError = getClientValidationError();
    if (clientError) {
      setError(clientError);
      return;
    }

    setSubmitting(true);
    try {
      const result = await register(email.trim(), username.trim(), password, displayName.trim(), mobileNumber.trim());
      if (result.requiresVerification) {
        navigate("/auth/verify-mobile", {
          replace: true,
          state: {
            notice: result.message || "Account created. Verify your mobile number with OTP.",
            verification: result.verification,
          },
        });
        return;
      }
      navigate("/", { replace: true });
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && !error.response) {
        setWakingUp(true);
        setError("Server is waking up. Retrying registration in a moment...");
        try {
          await ensureBackendReady();
          const retryResult = await register(email.trim(), username.trim(), password, displayName.trim(), mobileNumber.trim());
          if (retryResult.requiresVerification) {
            navigate("/auth/verify-mobile", {
              replace: true,
              state: {
                notice: retryResult.message || "Account created. Verify your mobile number with OTP.",
                verification: retryResult.verification,
              },
            });
            return;
          }
          navigate("/", { replace: true });
          return;
        } catch (retryError: unknown) {
          setError(getApiErrorMessage(retryError, "Server is still waking up. Please try again in a few seconds."));
        } finally {
          setWakingUp(false);
        }
      } else {
        setError(getApiErrorMessage(error, "Registration failed"));
      }
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }

  const fields = [
    { id: "displayName", label: "Display Name", type: "text", value: displayName, setter: setDisplayName, placeholder: "Riya Sharma", icon: User, auto: "name", max: 100 },
    { id: "username", label: "Username", type: "text", value: username, setter: setUsername, placeholder: "riya_hosts", icon: AtSign, auto: "username", max: 50 },
    { id: "email", label: "Email", type: "email", value: email, setter: setEmail, placeholder: "you@example.com", icon: Mail, auto: "email", max: 254 },
    { id: "mobileNumber", label: "Mobile Number", type: "tel", value: mobileNumber, setter: setMobileNumber, placeholder: "+91 9876543210", icon: Smartphone, auto: "tel", max: 20 },
    { id: "password", label: "Password", type: "password", value: password, setter: setPassword, placeholder: "Min 8 characters", icon: Lock, auto: "new-password", min: 8, max: 128 },
  ];

  return (
    <div className="auth-ambient min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-accent to-hot shadow-2xl shadow-primary/30 mb-3 glow-badge"
          >
            <Sparkles className="w-7 h-7 text-white" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-2xl font-extrabold tracking-tight">
            <span className="text-text">mask</span>
            <span className="brand-gradient-text">On</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="text-text-dim text-sm mt-1">Create your exclusive social identity.</motion.p>
        </div>

        {/* Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }} className="glass-panel rounded-3xl p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              aria-live="polite"
              className="bg-error/10 border border-error/20 rounded-xl p-3 mb-6 text-error text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {fields.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                >
                  <label htmlFor={f.id} className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                    {f.label}
                  </label>
                  <div className="relative">
                    <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                    <input
                      id={f.id}
                      type={f.type}
                      value={f.value}
                      onChange={(e) => f.setter(e.target.value)}
                      required
                      autoComplete="off"
                      minLength={'min' in f ? f.min : undefined}
                      maxLength={'max' in f ? f.max : undefined}
                      aria-describedby={f.id === "password" ? "password-requirements" : undefined}
                      className="input-luxe w-full rounded-xl pl-10 pr-4 py-3.5 text-sm"
                      placeholder={f.placeholder}
                    />
                  </div>
                  {f.id === "password" && (
                    <p id="password-requirements" className="text-[11px] text-text-dim mt-2">
                      Password must be at least 8 characters.
                    </p>
                  )}
                </motion.div>
              );
            })}

            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.42 }}
            >
              <label htmlFor="confirmPassword" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  className="input-luxe w-full rounded-xl pl-10 pr-4 py-3.5 text-sm"
                  placeholder="Re-enter your password"
                />
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              type="submit"
              disabled={submitting}
              className="btn-primary-luxe w-full font-bold py-4 rounded-xl transition disabled:opacity-50 mt-3 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {wakingUp ? "Waking server..." : "Creating account..."}
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        <p className="text-text-muted text-sm text-center mt-6">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-primary font-semibold hover:text-accent transition">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
