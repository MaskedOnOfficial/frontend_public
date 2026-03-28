import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { getApiErrorMessage } from "../lib/errors";
import { ensureBackendAwake } from "../lib/api";

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
    void ensureBackendAwake(45000).catch(() => {
      // Ignore here; submit flow handles user-visible retry states.
    });
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

  return (
    <div className="auth-ambient min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="glass-panel w-full max-w-md rounded-3xl p-8 fade-rise">
        <h1 className="text-3xl font-bold text-text text-center mb-2">🎭 mask<span className="brand-gradient-text">On</span></h1>
        <p className="text-text-muted text-center mb-8">Create your private social identity.</p>

        {error && (
          <div className="bg-error/10 border border-error/30 rounded-lg p-3 mb-6 text-error text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="displayName" className="block text-sm text-text-muted mb-1">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="input-luxe w-full rounded-lg px-4 py-3"
              placeholder="Riya Sharma"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm text-text-muted mb-1">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="input-luxe w-full rounded-lg px-4 py-3"
              placeholder="riya_hosts"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-text-muted mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-luxe w-full rounded-lg px-4 py-3"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-text-muted mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="input-luxe w-full rounded-lg px-4 py-3"
              placeholder="Min 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary-luxe w-full font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {submitting ? (wakingUp ? "Waking server..." : "Creating account...") : "Create Account"}
          </button>
        </form>

        <p className="text-text-muted text-sm text-center mt-6">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
