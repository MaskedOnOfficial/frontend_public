import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import RatingStars from "../components/rating-stars";
import type { Party, Attendee } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import { ArrowLeft, Star, CheckCircle, Loader2, Send } from "lucide-react";

interface RatingDraft {
  rated_id: string;
  score: number;
  comment: string;
}

interface ExistingRating {
  rater_id: string;
  rated_id: string;
}

export default function RateAttendeesPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const { user } = useAuth();

  const [party, setParty] = useState<Party | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RatingDraft>>({});
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [partyRes, attendeesRes, ratingsRes] = await Promise.all([
        api.get(`/parties/${partyId}`),
        api.get(`/parties/${partyId}/attendees`),
        api.get(`/parties/${partyId}/ratings`),
      ]);
      setParty(partyRes.data.data.party);
      setAttendees(attendeesRes.data.data.attendees);

      const myRatings = (ratingsRes.data.data.ratings as ExistingRating[]).filter(
        (r) => r.rater_id === user?.id,
      );
      setSubmitted(new Set<string>(myRatings.map((r) => r.rated_id)));
    } catch (loadError) {
      console.error("Failed to load rating data:", getApiErrorMessage(loadError, "Unknown rating data error"));
      setError("Failed to load party data");
    } finally {
      setLoading(false);
    }
  }, [partyId, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  function updateDraft(userId: string, field: keyof RatingDraft, value: string | number) {
    setDrafts((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], rated_id: userId, [field]: value } as RatingDraft,
    }));
  }

  async function submitRating(userId: string) {
    const draft = drafts[userId];
    if (!draft || !draft.score) return;
    setSubmitting(userId);
    setError("");
    try {
      await api.post(`/parties/${partyId}/ratings`, {
        rated_id: userId,
        score: draft.score,
        comment: draft.comment || undefined,
      });
      setSubmitted((prev) => new Set(prev).add(userId));
      setDrafts((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    } catch (submitError: unknown) {
      setError(getApiErrorMessage(submitError, "Failed to submit rating"));
    } finally {
      setSubmitting(null);
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

  const rateable = attendees.filter((a) => a.user_id !== user?.id);
  const isHost = party.host_id === user?.id;

  if (!isHost && party.host_id) {
    rateable.unshift({
      id: `host-${party.host_id}`,
      party_id: partyId!,
      user_id: party.host_id,
      payment_id: null,
      checked_in: 0,
      joined_at: party.created_at,
      username: party.host_username,
      display_name: party.host_display_name ?? party.host_username ?? "Host",
      avatar_url: party.host_avatar_url ?? null,
      social_rating: party.host_social_rating,
    });
  }

  const ratingOpen = new Date(party.date_time) <= new Date();

  return (
    <div className="min-h-screen bg-bg py-6 md:py-8 px-4 pb-28 md:pb-12">
      <div className="max-w-4xl mx-auto">
        <Link to={`/parties/${partyId}`} className="text-text-muted text-sm hover:text-text transition mb-4 inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to party
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning to-hot flex items-center justify-center shadow-lg shadow-warning/20">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">Reputation Studio</p>
              <h1 className="text-2xl font-bold text-text tracking-tight">Rate Attendees</h1>
            </div>
          </div>
          <p className="text-text-muted text-sm">{party.title}</p>
        </motion.div>

        {error && <p className="text-error text-sm mb-4 bg-error/10 border border-error/20 px-4 py-3 rounded-xl">{error}</p>}

        {!ratingOpen ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <Star className="w-10 h-10 text-text-dim mx-auto mb-3" />
            <p className="text-text-muted font-semibold">Ratings open once the party has ended.</p>
          </div>
        ) : rateable.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <p className="text-text-muted font-semibold">No attendees to rate.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rateable.map((attendee, i) => (
              <motion.div
                key={attendee.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
                className="glass-panel rounded-2xl p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Link to={`/profile/${attendee.user_id}`} className="shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-warning to-hot p-[2px]">
                      <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-text font-bold text-sm">
                        {attendee.avatar_url ? (
                          <img src={attendee.avatar_url} alt={attendee.display_name || "Attendee"} className="w-full h-full object-cover" />
                        ) : (
                          (attendee.display_name || "?").charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>
                  </Link>
                  <div>
                    <Link to={`/profile/${attendee.user_id}`} className="text-text font-bold text-sm hover:text-primary transition">{attendee.display_name}</Link>
                    <p className="text-text-muted text-xs">@{attendee.username}</p>
                  </div>
                </div>

                {submitted.has(attendee.user_id) ? (
                  <div className="flex items-center gap-2 text-success font-bold text-sm bg-success/10 rounded-xl px-4 py-3 border border-success/15">
                    <CheckCircle className="w-4 h-4" />
                    Rating submitted
                  </div>
                ) : (
                  <div className="space-y-3">
                    <RatingStars
                      rating={drafts[attendee.user_id]?.score || 0}
                      interactive
                      onChange={(score) => updateDraft(attendee.user_id, "score", score)}
                      size="lg"
                    />
                    <textarea
                      placeholder="Optional comment..."
                      value={drafts[attendee.user_id]?.comment || ""}
                      onChange={(e) => updateDraft(attendee.user_id, "comment", e.target.value.slice(0, 500))}
                      rows={2}
                      maxLength={500}
                      className="input-luxe w-full rounded-xl px-4 py-3 resize-none text-sm"
                    />
                    {(drafts[attendee.user_id]?.comment?.length || 0) > 400 && (
                      <p className="text-text-dim text-[10px] text-right mt-1">{drafts[attendee.user_id]?.comment?.length || 0}/500</p>
                    )}
                    <button
                      onClick={() => submitRating(attendee.user_id)}
                      disabled={!drafts[attendee.user_id]?.score || submitting === attendee.user_id}
                      className="btn-primary-luxe px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center gap-2"
                    >
                      {submitting === attendee.user_id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Submitting...</> : <><Send className="w-3.5 h-3.5" />Submit Rating</>}
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
