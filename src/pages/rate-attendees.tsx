import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import RatingStars from "../components/rating-stars";
import type { Party, Attendee } from "../types";
import { getApiErrorMessage } from "../lib/errors";

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  function updateDraft(userId: string, field: keyof RatingDraft, value: string | number) {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        rated_id: userId,
        [field]: value,
      } as RatingDraft,
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
    } catch (submitError: unknown) {
      setError(getApiErrorMessage(submitError, "Failed to submit rating"));
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted">Loading...</div>;
  }

  if (!party) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-error">{error || "Party not found"}</p>
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
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to={`/parties/${partyId}`} className="text-text-muted text-sm hover:text-text transition mb-4 inline-block">
          ? Back to party
        </Link>

        <div className="glass-panel rounded-2xl p-6 mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-2">Reputation Studio</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">Rate Attendees</h1>
          <p className="text-text-muted mt-1">{party.title}</p>
        </div>

        {error && <p className="text-error text-sm mb-4 bg-error/10 px-4 py-2 rounded">{error}</p>}

        {!ratingOpen ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <p className="text-text-muted">Ratings open once the party has ended.</p>
          </div>
        ) : rateable.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <p className="text-text-muted">No attendees to rate.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rateable.map((attendee) => (
              <div key={attendee.id} className="glass-panel rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-white font-bold overflow-hidden">
                    {attendee.avatar_url ? (
                      <img src={attendee.avatar_url} alt={attendee.display_name || "Attendee"} className="w-full h-full object-cover" />
                    ) : (
                      (attendee.display_name || "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-text font-semibold">{attendee.display_name}</p>
                    <p className="text-text-muted text-xs">@{attendee.username}</p>
                  </div>
                </div>

                {submitted.has(attendee.user_id) ? (
                  <div className="text-success text-sm font-semibold">? Rating submitted</div>
                ) : (
                  <div>
                    <RatingStars
                      value={drafts[attendee.user_id]?.score || 0}
                      onChange={(score) => updateDraft(attendee.user_id, "score", score)}
                    />
                    <textarea
                      placeholder="Optional comment..."
                      value={drafts[attendee.user_id]?.comment || ""}
                      onChange={(e) => updateDraft(attendee.user_id, "comment", e.target.value)}
                      rows={3}
                      className="input-luxe w-full mt-3 rounded-lg px-4 py-2 resize-none text-sm"
                    />
                    <button
                      onClick={() => submitRating(attendee.user_id)}
                      disabled={!drafts[attendee.user_id]?.score || submitting === attendee.user_id}
                      className="btn-primary-luxe mt-3 px-5 py-2 rounded-lg text-sm disabled:opacity-50"
                    >
                      {submitting === attendee.user_id ? "Submitting..." : "Submit Rating"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
