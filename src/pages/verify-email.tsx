import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { useAuth } from "../context/auth-hook";

type Status = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const { refreshUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }

    api
      .get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => {
        setStatus("success");
        setMessage("Your email has been verified! You can now host parties.");
        refreshUser().catch(() => {});
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(getApiErrorMessage(err, "This verification link is invalid or has already been used."));
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-8 rounded-2xl text-center max-w-sm w-full"
      >
        {status === "loading" && (
          <>
            <Loader className="w-12 h-12 mx-auto animate-spin text-purple-400 mb-4" />
            <h2 className="text-xl font-semibold">Verifying your email…</h2>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Email Verified!</h2>
            <p className="text-gray-400 text-sm mb-6">{message}</p>
            <Link to="/" className="btn-primary-luxe block text-center py-3 rounded-xl">
              Go to Home
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Verification Failed</h2>
            <p className="text-gray-400 text-sm mb-6">{message}</p>
            <Link to="/" className="btn-secondary-luxe block text-center py-3 rounded-xl">
              Go to Home
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
