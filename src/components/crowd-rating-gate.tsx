import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MapPin, Calendar, Loader2, PartyPopper } from "lucide-react";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

interface PendingParty {
  id: string;
  title: string;
  date_time: string;
  end_time: string | null;
  cover_image_url: string | null;
  location_name: string;
  location_city: string;
}

interface CrowdRatingGateProps {
  pendingParties: PendingParty[];
  onAllRated: () => void;
}

export default function CrowdRatingGate({ pendingParties, onAllRated }: CrowdRatingGateProps) {
  const [remaining, setRemaining] = useState(pendingParties);
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const current = remaining[0];

  async function handleSubmit() {
    if (!current || score === 0) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post(`/parties/${current.id}/ratings/crowd`, { score });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setScore(0);
        setHoverScore(0);
        const next = remaining.slice(1);
        setRemaining(next);
        if (next.length === 0) {
          onAllRated();
        }
      }, 800);
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to submit rating");
      // If window closed or already rated, skip this party
      if (msg.includes("window") || msg.includes("already")) {
        const next = remaining.slice(1);
        setRemaining(next);
        setScore(0);
        setHoverScore(0);
        if (next.length === 0) onAllRated();
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!current) return null;

  const partyDate = new Date(current.end_time || current.date_time).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const activeScore = hoverScore || score;

  return (
    <div className="fixed inset-0 z-[200] bg-bg flex items-center justify-center px-4">
      <motion.div
        key={current.id}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-accent to-hot mx-auto mb-4 flex items-center justify-center shadow-xl shadow-primary/25">
            <PartyPopper className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-text tracking-tight">Rate the Vibe</h1>
          <p className="text-text-muted text-sm mt-1">
            How was the crowd at this party?
            {remaining.length > 1 && (
              <span className="text-text-dim"> • {remaining.length} parties to rate</span>
            )}
          </p>
        </div>

        {/* Party Card */}
        <div className="glass-panel rounded-3xl overflow-hidden mb-6">
          {current.cover_image_url && (
            <div className="h-36 bg-surface overflow-hidden">
              <img
                src={current.cover_image_url}
                alt={current.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-5">
            <h2 className="text-lg font-bold text-text mb-2">{current.title}</h2>
            <div className="flex flex-col gap-1.5 text-text-muted text-xs">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                {current.location_name}, {current.location_city}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                {partyDate}
              </span>
            </div>
          </div>
        </div>

        {/* Star Rating */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHoverScore(i)}
                onMouseLeave={() => setHoverScore(0)}
                onClick={() => setScore(i)}
                disabled={submitting}
                className="transition-all duration-200 hover:scale-125 active:scale-95 tap-active"
              >
                <Star
                  className={`w-10 h-10 transition-all duration-200 ${
                    i <= activeScore
                      ? "text-warning drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                      : "text-text-dim/20"
                  }`}
                  fill={i <= activeScore ? "currentColor" : "none"}
                  strokeWidth={i <= activeScore ? 0 : 1.5}
                />
              </button>
            ))}
          </div>
          <p className="text-text-muted text-sm font-medium h-5">
            {activeScore === 1 && "Terrible vibes 😬"}
            {activeScore === 2 && "Below average 😕"}
            {activeScore === 3 && "Decent crowd 🙂"}
            {activeScore === 4 && "Great energy! 🔥"}
            {activeScore === 5 && "Absolutely electric! ⚡"}
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-error text-xs bg-error/10 border border-error/15 px-4 py-2.5 rounded-xl mb-4 text-center">
            {error}
          </p>
        )}

        {/* Submit */}
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-success/15 border border-success/20 text-success font-bold text-sm py-4 rounded-2xl text-center"
            >
              ✓ Rating submitted!
            </motion.div>
          ) : (
            <motion.button
              key="submit"
              onClick={handleSubmit}
              disabled={score === 0 || submitting}
              className="btn-primary-luxe w-full py-4 rounded-2xl text-base font-bold disabled:opacity-40 flex items-center justify-center gap-2 tap-active"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
              ) : (
                <>Submit Rating</>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        <p className="text-text-dim text-[10px] text-center mt-4 leading-relaxed">
          Rate the overall crowd energy and vibe. Your rating helps build trust in the community.
          You must rate every party you attend before continuing.
        </p>
      </motion.div>
    </div>
  );
}
