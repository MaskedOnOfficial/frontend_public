import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-context";
import type { Party, Attendee } from "../types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `₹${(price / 100).toLocaleString("en-IN")}`;
}

function parseTags(tags: string | string[] | null): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try { return JSON.parse(tags); } catch { return []; }
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

  useEffect(() => {
    loadParty();
  }, [partyId]);

  async function loadParty() {
    try {
      const [partyRes, attendeesRes] = await Promise.all([
        api.get(`/parties/${partyId}`),
        api.get(`/parties/${partyId}/attendees`),
      ]);
      setParty(partyRes.data.data.party);
      setAttendees(attendeesRes.data.data.attendees);

      // Check if user has a request
      if (user) {
        try {
          const reqsRes = await api.get("/users/me/requests");
          const myReq = reqsRes.data.data.requests.find(
            (r: any) => r.party_id === partyId
          );
          if (myReq) setRequestStatus(myReq.status);
        } catch {}
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || "Party not found";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinRequest() {
    setRequesting(true);
    setError("");
    try {
      await api.post(`/parties/${partyId}/requests`, { message: message || undefined });
      setRequestStatus("pending");
      setMessage("");
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to send request");
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
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Payment failed");
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
  // Party is rateable once its end time (or start time) has passed
  const isPartyPast = new Date(party.end_time ?? party.date_time) < new Date();
  // Show Rate button for host OR for confirmed attendees
  const canRate = isPartyPast && (isHost || alreadyAttending);

  return (
    <div className="min-h-screen bg-bg">
      {/* Cover */}
      <div className="h-64 bg-gradient-to-br from-accent/40 to-primary/30 relative">
        {party.cover_image_url && (
          <img src={party.cover_image_url} alt={party.title} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg/80 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10">
        {/* Title card */}
        <div className="bg-surface rounded-xl border border-text-muted/10 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <span className={`text-xs font-semibold px-2 py-1 rounded mb-2 inline-block ${
                party.status === "upcoming" ? "bg-success/20 text-success" :
                party.status === "cancelled" ? "bg-error/20 text-error" :
                "bg-text-muted/20 text-text-muted"
              }`}>
                {party.status.toUpperCase()}
              </span>
              <h1 className="text-3xl font-bold text-text mt-2">{party.title}</h1>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{formatPrice(party.ticket_price)}</div>
              <div className="text-text-muted text-sm">👥 {party.current_attendees}/{party.max_capacity}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm">
            <div className="text-text-muted">
              <span className="block text-text font-semibold mb-1">📅 When</span>
              {formatDate(party.date_time)}
              {party.end_time && <span className="block">→ {formatDate(party.end_time)}</span>}
            </div>
            <div className="text-text-muted">
              <span className="block text-text font-semibold mb-1">📍 Where</span>
              {party.location_name}
              <span className="block">{party.location_city}</span>
            </div>
          </div>

          {party.description && (
            <p className="text-text-muted mt-6 whitespace-pre-wrap">{party.description}</p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag) => (
                <span key={tag} className="bg-accent/20 text-accent-hover text-xs px-3 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {party.min_rating > 0 && (
            <p className="text-warning text-sm mt-4">
              ⚠️ Minimum rating required: ⭐ {party.min_rating.toFixed(1)}
            </p>
          )}
        </div>

        {/* Host info */}
        {party.host_display_name && (
          <div className="bg-surface rounded-xl border border-text-muted/10 p-4 mb-6 flex items-center gap-4">
            <Link to={`/profile/${party.host_id}`} className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white font-bold text-lg overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-primary transition">
              {party.host_avatar_url ? (
                <img src={party.host_avatar_url} alt={party.host_display_name} className="w-full h-full object-cover" />
              ) : (
                party.host_display_name.charAt(0).toUpperCase()
              )}
            </Link>
            <div>
              <Link to={`/profile/${party.host_id}`} className="text-text font-semibold hover:text-primary transition">{party.host_display_name}</Link>
              <p className="text-text-muted text-sm">
                @{party.host_username} · ⭐ {party.host_social_rating?.toFixed(1) || "N/A"}
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              {isHost && (
                <button
                  onClick={() => navigate(`/dashboard/${party.id}/requests`)}
                  className="bg-accent hover:bg-accent-hover text-white font-semibold text-sm px-4 py-2 rounded-lg transition"
                >
                  Manage Requests
                </button>
              )}
            </div>
          </div>
        )}

        {/* Party links — Photos & Ratings */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => navigate(`/parties/${party.id}/photos`)}
            className="bg-surface border border-text-muted/10 text-text hover:bg-surface-light font-semibold text-sm px-5 py-2.5 rounded-lg transition"
          >
            📷 Photos
          </button>
          {canRate && (
            <button
              onClick={() => navigate(`/parties/${party.id}/rate`)}
              className="bg-warning/10 border border-warning/20 text-warning hover:bg-warning/20 font-semibold text-sm px-5 py-2.5 rounded-lg transition"
            >
              ⭐ Rate Members
            </button>
          )}
        </div>

        {/* Action area */}
        {user && !isHost && party.status === "upcoming" && (
          <div className="bg-surface rounded-xl border border-text-muted/10 p-6 mb-6">
            {error && <p className="text-error text-sm mb-3">{error}</p>}

            {alreadyAttending ? (
              <div className="text-center text-success font-semibold py-2">
                ✅ You're attending this party!
              </div>
            ) : requestStatus === "paid" ? (
              <div className="text-center text-success font-semibold py-2">
                ✅ Payment confirmed — you're in!
              </div>
            ) : requestStatus === "approved" && party.ticket_price > 0 ? (
              <div className="text-center">
                <p className="text-success mb-3">Your request was approved!</p>
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="bg-primary hover:bg-primary-hover text-white font-semibold px-8 py-3 rounded-lg transition disabled:opacity-50"
                >
                  {paying ? "Processing..." : `Pay ${formatPrice(party.ticket_price)}`}
                </button>
              </div>
            ) : requestStatus === "approved" ? (
              <div className="text-center text-success font-semibold py-2">
                ✅ Your request was approved! You're attending.
              </div>
            ) : requestStatus === "pending" ? (
              <div className="text-center text-warning font-semibold py-2">
                ⏳ Your join request is pending host approval
              </div>
            ) : requestStatus === "rejected" ? (
              <div className="text-center text-error font-semibold py-2">
                ❌ Your request was not approved for this party
              </div>
            ) : (
              <div>
                <textarea
                  placeholder="Optional message to the host..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className="w-full bg-bg border border-text-muted/20 text-text rounded-lg px-4 py-3 mb-3 resize-none focus:outline-none focus:border-primary"
                />
                <button
                  onClick={handleJoinRequest}
                  disabled={requesting || party.current_attendees >= party.max_capacity}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {requesting ? "Sending..." :
                   party.current_attendees >= party.max_capacity ? "Party is Full" :
                   "Request to Join"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Attendees */}
        {attendees.length > 0 && (
          <div className="bg-surface rounded-xl border border-text-muted/10 p-6 mb-6">
            <h2 className="text-text font-semibold text-lg mb-4">
              Attendees ({attendees.length})
            </h2>
            <div className="flex flex-wrap gap-3">
              {attendees.map((a) => (
                <Link key={a.id} to={`/profile/${a.user_id}`} className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2 hover:bg-primary/10 transition-colors">
                  {a.avatar_url ? (
                    <img src={`${import.meta.env.VITE_API_URL}/${a.avatar_url}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
                      {(a.display_name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-text text-sm hover:text-primary transition-colors">{a.display_name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
