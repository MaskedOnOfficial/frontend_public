import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-context";
import RatingStars from "../components/rating-stars";
import type { Party, Attendee } from "../types";

interface RatingDraft {
  rated_id: string;
  score: number;
  comment: string;
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

  useEffect(() => {
    loadData();
  }, [partyId]);

  async function loadData() {
    try {
      const [partyRes, attendeesRes, ratingsRes] = await Promise.all([
        api.get(`/parties/${partyId}`),
        api.get(`/parties/${partyId}/attendees`),
        api.get(`/parties/${partyId}/ratings`),
      ]);
      setParty(partyRes.data.data.party);
      setAttendees(attendeesRes.data.data.attendees);

      // Mark already-rated users
      const myRatings = ratingsRes.data.data.ratings.filter(
        (r: any) => r.rater_id === user?.id
      );
      const alreadyRated = new Set(myRatings.map((r: any) => r.rated_id));
      setSubmitted(alreadyRated);
    } catch {
      setError("Failed to load party data");
    } finally {
      setLoading(false);
    }
  }

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
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to submit rating");
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

  // Filter out current user from the list + include host if user is attendee
  const rateable = attendees.filter((a) => a.user_id !== user?.id);
  // Also add host as rateable if current user is an attendee (not host)
  const isHost = party.host_id === user?.id;

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to={`/parties/${partyId}`} className="text-accent text-sm hover:underline mb-4 inline-block">
          ← Back to party
        </Link>

        <h1 className="text-2xl font-bold text-text mb-2">Rate Attendees</h1>
        <p className="text-text-muted mb-6">{party.title}</p>

        {error && <p className="text-error text-sm mb-4 bg-error/10 px-4 py-2 rounded">{error}</p>}

        {party.status !== "completed" ? (
          <div className="bg-surface rounded-xl p-8 text-center">
            <p className="text-text-muted">Ratings are available once the party is completed.</p>
          </div>
        ) : rateable.length === 0 && !isHost ? (
          <div className="bg-surface rounded-xl p-8 text-center">
            <p className="text-text-muted">No attendees to rate.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rateable.map((attendee) => (
              <div key={attendee.id} className="bg-surface rounded-xl border border-text-muted/10 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">
                    {(attendee.display_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-text font-semibold">{attendee.display_name}</p>
                    <p className="text-text-muted text-xs">@{attendee.username}</p>
                  </div>
                </div>

                {submitted.has(attendee.user_id) ? (
                  <div className="text-success text-sm font-semibold">
                    ✅ Rating submitted
                  </div>
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
                      rows={2}
                      className="w-full mt-3 bg-bg border border-text-muted/20 text-text rounded-lg px-4 py-2 resize-none focus:outline-none focus:border-primary text-sm"
                    />
                    <button
                      onClick={() => submitRating(attendee.user_id)}
                      disabled={!drafts[attendee.user_id]?.score || submitting === attendee.user_id}
                      className="mt-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-5 py-2 rounded-lg transition disabled:opacity-50"
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
