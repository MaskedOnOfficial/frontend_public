import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import type { Party } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Loader2, PartyPopper, MapPin, Calendar, CheckCircle } from "lucide-react";

export default function RateCrowdPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [partyAvg, setPartyAvg] = useState<{ average: number; total_votes: number } | null>(null);
  const [alreadyRated, setAlreadyRated] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [partyRes, ratingsRes] = await Promise.all([
        api.get(`/parties/${partyId}`),
        api.get(`/parties/${partyId}/ratings`),
      ]);
      setParty(partyRes.data.data.party);
      setPartyAvg({
        average: ratingsRes.data.data.average,
        total_votes: ratingsRes.data.data.total_votes,
      });
      // Check if the user already rated
      const ratings = ratingsRes.data.data.ratings || [];
      if (ratings.some((r: any) => r.user_id === user?.id)) {
        setAlreadyRated(true);
      }
    } catch (loadError) {
      console.error("Failed to load party:", getApiErrorMessage(loadError, "Unknown error"));
      setError("Failed to load party data");
    } finally {
      setLoading(false);
    }
  }, [partyId, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit() {
    if (!partyId || score === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post(`/parties/${partyId}/ratings/crowd`, { score });
      setSubmitted(true);
      if (res.data.data.party_average) {
        setPartyAvg({
          average: res.data.data.party_average.avg_score,
          total_votes: res.data.data.party_average.total_votes,
        });
      }
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Failed to submit rating"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!party) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-error text-lg font-semibold">{error || "Party not found"}</p>
      </div>
    );
  }

  const isEnded = new Date(party.end_time || party.date_time) < new Date();
  const activeScore = hoverScore || score;
  const partyDate = new Date(party.end_time || party.date_time).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-bg py-6 md:py-8 px-4 pb-28 md:pb-12">
      <div className="max-w-lg mx-auto">
        <Link to={`/parties/${partyId}`} className="text-text-muted text-sm hover:text-text transition mb-4 inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to party
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-3xl overflow-hidden mb-6">
          {party.cover_image_url && (
            <div className="h-40 bg-surface overflow-hidden">
              <img src={party.cover_image_url} alt={party.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-accent to-hot flex items-center justify-center shadow-lg">
                <PartyPopper className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">Rate the Vibe</p>
                <h1 className="text-xl font-bold text-text tracking-tight">{party.title}</h1>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-text-muted text-xs">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-accent" /> {party.location_name}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-primary" /> {partyDate}</span>
            </div>
          </div>
        </motion.div>

        {/* Average display */}
        {partyAvg && partyAvg.total_votes > 0 && (
          <div className="glass-panel rounded-2xl p-4 mb-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-warning/10 border border-warning/15 flex items-center justify-center">
              <Star className="w-6 h-6 text-warning fill-current" />
            </div>
            <div>
              <div className="text-xl font-bold text-warning">{partyAvg.average.toFixed(1)}<span className="text-text-dim text-xs font-semibold">/5</span></div>
              <p className="text-text-dim text-[10px]">{partyAvg.total_votes} crowd rating{partyAvg.total_votes !== 1 ? "s" : ""}</p>
            </div>
          </div>
        )}

        {error && <p className="text-error text-sm mb-4 bg-error/10 border border-error/20 px-4 py-3 rounded-xl">{error}</p>}

        {!isEnded ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <Star className="w-10 h-10 text-text-dim mx-auto mb-3" />
            <p className="text-text-muted font-semibold">Ratings open once the party has ended.</p>
          </div>
        ) : alreadyRated || submitted ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel rounded-2xl p-8 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="text-text font-bold text-lg mb-1">Rating submitted!</p>
            <p className="text-text-muted text-sm mb-4">Thanks for rating the crowd vibe.</p>
            <button onClick={() => navigate(`/parties/${partyId}`)} className="btn-primary-luxe px-6 py-3 rounded-xl text-sm font-bold tap-active">
              Back to Party
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6 text-center">
            <p className="text-text font-bold mb-4">How was the crowd energy?</p>
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
            <p className="text-text-muted text-sm font-medium h-5 mb-4">
              {activeScore === 1 && "Terrible vibes 😬"}
              {activeScore === 2 && "Below average 😕"}
              {activeScore === 3 && "Decent crowd 🙂"}
              {activeScore === 4 && "Great energy! 🔥"}
              {activeScore === 5 && "Absolutely electric! ⚡"}
            </p>
            <button
              onClick={handleSubmit}
              disabled={score === 0 || submitting}
              className="btn-primary-luxe w-full py-3.5 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2 tap-active"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit Rating"}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
