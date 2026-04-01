import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { getApiErrorMessage } from "../lib/errors";
import { ensureBackendAwake } from "../lib/api";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2, User, AtSign, Mail, Lock } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
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
      await register(email, username, password, displayName);
      navigate("/");
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && !error.response) {
        setWakingUp(true);
        setError("Server is waking up. Retrying registration in a moment...");
        try {
          await ensureBackendAwake();
          await register(email, username, password, displayName);
          navigate("/");
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
      setSubmitting(false);
    }
  }

  const fields = [
    { id: "displayName", label: "Display Name", type: "text", value: displayName, setter: setDisplayName, placeholder: "Riya Sharma", icon: User, auto: "name" },
    { id: "username", label: "Username", type: "text", value: username, setter: setUsername, placeholder: "riya_hosts", icon: AtSign, auto: "username" },
    { id: "email", label: "Email", type: "email", value: email, setter: setEmail, placeholder: "you@example.com", icon: Mail, auto: "email" },
    { id: "password", label: "Password", type: "password", value: password, setter: setPassword, placeholder: "Min 8 characters", icon: Lock, auto: "new-password", min: 8 },
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
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-accent to-hot shadow-2xl shadow-primary/30 mb-4"
          >
            <Sparkles className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-text">mask</span>
            <span className="brand-gradient-text">On</span>
          </h1>
          <p className="text-text-muted text-sm mt-2">Create your exclusive social identity.</p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-3xl p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-error/10 border border-error/20 rounded-xl p-3 mb-6 text-error text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                      autoComplete={f.auto}
                      minLength={'min' in f ? f.min : undefined}
                      className="input-luxe w-full rounded-xl pl-10 pr-4 py-3.5 text-sm"
                      placeholder={f.placeholder}
                    />
                  </div>
                </motion.div>
              );
            })}

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
        </div>

        <p className="text-text-muted text-sm text-center mt-7">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-primary font-semibold hover:text-accent transition">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
