import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import type { Party, Attendee } from "../types";
import { getApiErrorMessage } from "../lib/errors";

interface MyRequestSummary {
  party_id: string;
  status: string;
}

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `₹${(price / 100).toLocaleString("en-IN")}`;
}

function parseTags(tags: string | string[] | null): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

export default function PartyDetailPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [party, setParty] = useState<Party | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isHost = party && user && party.host_id === user.id;

  const loadParty = useCallback(async () => {
    try {
      const [partyRes, attendeesRes] = await Promise.all([
        api.get(`/parties/${partyId}`),
        api.get(`/parties/${partyId}/attendees`),
      ]);
      setParty(partyRes.data.data.party);
      setAttendees(attendeesRes.data.data.attendees);

      if (user) {
        try {
          const reqsRes = await api.get("/users/me/requests");
          const myReq = (reqsRes.data.data.requests as MyRequestSummary[]).find(
            (r) => r.party_id === partyId,
          );
          if (myReq) setRequestStatus(myReq.status);
        } catch (loadError) {
          console.error("Failed to load user request status:", getApiErrorMessage(loadError, "Unknown request status error"));
        }
      }
    } catch (loadError: unknown) {
      setError(getApiErrorMessage(loadError, "Party not found"));
    } finally {
      setLoading(false);
    }
  }, [partyId, user]);

  useEffect(() => {
    loadParty();
  }, [loadParty]);

  async function handleJoinRequest() {
    setRequesting(true);
    setError("");
    try {
      await api.post(`/parties/${partyId}/requests`, { message: message || undefined });
      setRequestStatus("pending");
      setMessage("");
    } catch (joinError: unknown) {
      setError(getApiErrorMessage(joinError, "Failed to send request"));
    } finally {
      setRequesting(false);
    }
  }

  async function handlePay() {
    setPaying(true);
    setError("");
    try {
      await api.post(`/parties/${partyId}/pay`);
      setRequestStatus("paid");
      loadParty();
    } catch (payError: unknown) {
      setError(getApiErrorMessage(payError, "Payment failed"));
    } finally {
      setPaying(false);
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

  const tags = parseTags(party.tags);
  const alreadyAttending = attendees.some((a) => a.user_id === user?.id);
  const isPartyPast = new Date(party.end_time ?? party.date_time) < new Date();
  const canRate = isPartyPast && (isHost || alreadyAttending);
  const isFull = party.current_attendees >= party.max_capacity;
  const canRequestToJoin = party.status === "upcoming";

  return (
    <div className="min-h-screen bg-bg pb-8">
      {/* Hero image */}
      <div className="relative h-60 md:h-80 overflow-hidden bg-surface">
        {party.cover_image_url && (
          <img
            src={party.cover_image_url}
            alt={party.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition"
        >
          ←
        </button>
        <div className="absolute top-4 right-4 z-10">
          <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition text-lg">
            ⋮
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6">
        {/* Title & Status */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-3xl md:text-4xl font-bold text-text flex-1">{party.title}</h1>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                party.status === "upcoming"
                  ? "bg-success/30 text-success"
                  : party.status === "ongoing"
                    ? "bg-primary/30 text-primary"
                    : "bg-text-muted/30 text-text-muted"
              }`}
            >
              {party.status.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-muted">⭐ 4.8 (100 reviews)</span>
            <span className="text-warning font-semibold">{party.current_attendees}/{party.max_capacity} attending</span>
          </div>
        </div>

        {/* Key details grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="glass-panel rounded-xl p-4">
            <p className="text-text-muted text-xs mb-1">When</p>
            <p className="text-text text-sm font-semibold">{new Date(party.date_time).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}</p>
            <p className="text-text-muted text-xs mt-1">{new Date(party.date_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <p className="text-text-muted text-xs mb-1">Where</p>
            <p className="text-text text-sm font-semibold">📍 {party.location_city}</p>
            <p className="text-text-muted text-xs mt-1">{party.location_name}</p>
          </div>
        </div>

        {/* About section */}
        {party.description && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-text mb-3">✨ About this Event</h2>
            <p className="text-text-muted leading-relaxed whitespace-pre-wrap text-sm">{party.description}</p>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-text-muted mb-2 uppercase tracking-wide">Vibes</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="bg-accent/20 text-[#9ed4d1] text-xs px-3 py-1.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Host card */}
        {party.host_display_name && (
          <div className="glass-panel rounded-xl p-5 mb-8">
            <p className="text-xs uppercase tracking-wide text-text-muted mb-3">Hosted by</p>
            <div className="flex items-center gap-3">
              <Link
                to={`/profile/${party.host_id}`}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-white font-bold text-lg overflow-hidden"
              >
                {party.host_avatar_url ? (
                  <img src={party.host_avatar_url} alt={party.host_display_name} className="w-full h-full object-cover" />
                ) : (
                  party.host_display_name.charAt(0).toUpperCase()
                )}
              </Link>
              <div className="flex-1">
                <Link to={`/profile/${party.host_id}`} className="text-text font-semibold hover:text-primary transition block">
                  {party.host_display_name}
                </Link>
                <p className="text-text-muted text-xs">@{party.host_username} · ⭐ {party.host_social_rating?.toFixed(1) || "N/A"}</p>
              </div>
              {isHost && (
                <button
                  onClick={() => navigate(`/dashboard/${party.id}/requests`)}
                  className="btn-secondary-luxe px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap"
                >
                  Manage
                </button>
              )}
            </div>
          </div>
        )}

        {/* Attendees */}
        {attendees.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-text mb-3">👥 Attendees ({attendees.length})</h3>
            <div className="flex flex-wrap gap-2">
              {attendees.slice(0, 8).map((a) => (
                <Link
                  key={a.id}
                  to={`/profile/${a.user_id}`}
                  className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold overflow-hidden hover:ring-2 hover:ring-primary transition"
                  title={a.display_name || "Attendee"}
                >
                  {a.avatar_url ? (
                    <img src={a.avatar_url} alt={a.display_name || "Attendee"} className="w-full h-full object-cover" />
                  ) : (
                    (a.display_name || "?").charAt(0).toUpperCase()
                  )}
                </Link>
              ))}
              {attendees.length > 8 && (
                <div className="w-10 h-10 rounded-full bg-text-muted/20 flex items-center justify-center text-[10px] font-bold text-text-muted">
                  +{attendees.length - 8}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3 sticky bottom-0 bg-gradient-to-t from-bg to-bg/80 -mx-4 px-4 py-4 md:relative md:bg-transparent md:p-0">
          {user && !isHost && (
            <>
              {error && <p className="text-error text-sm bg-error/10 px-4 py-2 rounded-lg">{error}</p>}

              {alreadyAttending || requestStatus === "paid" ? (
                <div className="glass-panel rounded-lg p-4 border-success/30">
                  <p className="text-success font-semibold text-center">✓ You're on the guest list!</p>
                </div>
              ) : requestStatus === "approved" && party.ticket_price > 0 ? (
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="btn-primary-luxe w-full px-4 py-3.5 rounded-lg font-semibold disabled:opacity-50"
                >
                  {paying ? "Processing..." : `Buy Ticket · ${formatPrice(party.ticket_price)}`}
                </button>
              ) : requestStatus === "approved" ? (
                <div className="glass-panel rounded-lg p-4 border-success/30">
                  <p className="text-success font-semibold text-center">✓ Invite Accepted</p>
                </div>
              ) : requestStatus === "pending" ? (
                <div className="glass-panel rounded-lg p-4 border-warning/30">
                  <p className="text-warning font-semibold text-center">⏳ Awaiting approval</p>
                </div>
              ) : !canRequestToJoin ? (
                <div className="glass-panel rounded-lg p-4 border-text-muted/30">
                  <p className="text-text-muted font-semibold text-center">Invites are closed for this event</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    placeholder="Write a message to the host with your invite request..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    className="input-luxe w-full rounded-lg px-4 py-3 resize-none text-sm"
                  />
                  <button
                    onClick={handleJoinRequest}
                    disabled={requesting || isFull}
                    className="btn-primary-luxe w-full px-4 py-3.5 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {requesting
                      ? "Sending..."
                      : isFull
                        ? "Event is Full"
                        : requestStatus === "rejected" || requestStatus === "withdrawn"
                          ? "Send Invite Request Again"
                          : "Send Invite Request"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Guest action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate(`/parties/${party.id}/photos`)}
              className="btn-secondary-luxe px-4 py-3 rounded-lg text-sm font-semibold text-center"
            >
              📷 Photos
            </button>
            {canRate && (
              <button
                onClick={() => navigate(`/parties/${party.id}/rate`)}
                className="btn-secondary-luxe px-4 py-3 rounded-lg text-sm font-semibold text-center text-warning"
              >
                ⭐ Rate
              </button>
            )}
            {!canRate && (
              <button className="btn-secondary-luxe px-4 py-3 rounded-lg text-sm font-semibold text-center opacity-50 cursor-not-allowed">
                💬 Chat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
