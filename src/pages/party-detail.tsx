import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import type { Party, Attendee } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import { parseTags } from "../lib/parse-tags";
import { getTrustLevel } from "../lib/trust-levels";
import { ArrowLeft, MapPin, Calendar, Clock, Users, Star, Tag, Camera, Share2, Ticket, Shield, CheckCircle, Loader2, Send, PartyPopper, Edit3, MoreVertical, Flag, X } from "lucide-react";
import ReportModal from "../components/ReportModal";

interface PartyDetailPayload {
  party: Party;
  attendees: Attendee[];
  viewer?: {
    request_status: string | null;
    request_id: string | null;
    is_attending: boolean;
  };
}

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `₹${(price / 100).toLocaleString("en-IN")}`;
}

export default function PartyDetailPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [party, setParty] = useState<Party | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isHost = party && user && party.host_id === user.id;

  const loadParty = useCallback(async () => {
    try {
      const detailRes = await api.get(`/parties/${partyId}`);
      const data = detailRes.data.data as PartyDetailPayload;

      setParty(data.party);
      setAttendees(data.attendees || []);
      setRequestStatus(data.viewer?.request_status ?? null);
      setRequestId(data.viewer?.request_id ?? null);
    } catch (loadError: unknown) {
      setError(getApiErrorMessage(loadError, "Party not found"));
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    loadParty();
  }, [loadParty]);

  // Android hardware back button → go to Discover
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      navigate("/parties");
    };
    window.addEventListener("capacitor:backButton", handler);
    return () => window.removeEventListener("capacitor:backButton", handler);
  }, [navigate]);

  async function handleJoinRequest() {
    setRequesting(true);
    setError(""); // #31
    try {
      const res = await api.post(`/parties/${partyId}/requests`, { message: message || undefined });
      setRequestStatus("pending");
      setRequestId(res.data.data.request?.id ?? null);
      setMessage("");
      setError(""); // #31 — clear on success
    } catch (joinError: unknown) {
      setError(getApiErrorMessage(joinError, "Failed to send request"));
    } finally {
      setRequesting(false);
    }
  }

  async function handleWithdraw() {
    if (!requestId) return;
    setWithdrawing(true);
    setError("");
    try {
      await api.delete(`/parties/${partyId}/requests/${requestId}`);
      setRequestStatus("withdrawn");
      setRequestId(null);
    } catch (withdrawError: unknown) {
      setError(getApiErrorMessage(withdrawError, "Failed to withdraw request"));
    } finally {
      setWithdrawing(false);
    }
  }

  async function handlePay() {
    setPaying(true);
    setError("");
    try {
      await api.post(`/parties/${partyId}/pay`);
      setRequestStatus("paid");
      setError(""); // #31 — clear on success
      loadParty();
    } catch (payError: unknown) {
      setError(getApiErrorMessage(payError, "Payment failed"));
    } finally {
      setPaying(false);
    }
  }

  // Share state
  const [shareToast, setShareToast] = useState("");
  const shareTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Report state
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    return () => clearTimeout(shareTimerRef.current);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setShowMoreMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);



  // #30 — Share / copy link
  function handleShare() {
    const appUrl = import.meta.env.VITE_APP_URL as string || window.location.origin;
    const url = `${appUrl}/parties/${partyId}`;
    if (navigator.share) {
      navigator.share({ title: party?.title || "maskedOn Party", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShareToast("Link copied!");
        clearTimeout(shareTimerRef.current);
        shareTimerRef.current = setTimeout(() => setShareToast(""), 2000);
      }).catch(() => {});
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
        <div className="text-center">
          <PartyPopper className="w-12 h-12 text-text-dim mx-auto mb-4" />
          <p className="text-error text-lg font-semibold">{error || "Party not found"}</p>
        </div>
      </div>
    );
  }

  const tags = parseTags(party.tags);
  const alreadyAttending = attendees.some((a) => a.user_id === user?.id);
  const isPartyPast = new Date(party.end_time ?? party.date_time) < new Date();
  const canRate = isPartyPast && (isHost || alreadyAttending);
  const isFull = party.current_attendees >= party.max_capacity;
  const canRequestToJoin = party.status === "upcoming";
  const capacityPercent = Math.min(100, Math.round((party.current_attendees / party.max_capacity) * 100));

  function getStatusClasses(status: string) {
    switch (status) {
      case "upcoming": return "status-upcoming";
      case "ongoing": return "status-ongoing";
      case "completed": return "status-completed";
      default: return "status-cancelled";
    }
  }

  return (
    <div className="min-h-screen bg-bg pb-32 md:pb-8">
      {/* Hero image — #29 gradient placeholder when no cover */}
      <div className="relative h-64 md:h-96 overflow-hidden bg-surface">
        {party.cover_image_url ? (
          <motion.img
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.2 }}
            src={party.cover_image_url}
            alt={party.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-hot/10 flex items-center justify-center">
            <PartyPopper className="w-20 h-20 text-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-bg/60 backdrop-blur-md border border-primary/10 flex items-center justify-center text-text hover:bg-bg/80 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {/* #30 — Share button + "..." report menu */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button onClick={handleShare} aria-label="Share this party" title="Share" className="w-10 h-10 rounded-full bg-bg/60 backdrop-blur-md border border-primary/10 flex items-center justify-center text-text hover:bg-bg/80 transition">
            <Share2 className="w-5 h-5" />
          </button>
          {user && !isHost && (
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu((v) => !v)}
                aria-label="More options"
                className="w-10 h-10 rounded-full bg-bg/60 backdrop-blur-md border border-primary/10 flex items-center justify-center text-text hover:bg-bg/80 transition"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMoreMenu && (
                <div className="absolute top-full right-0 mt-1 glass-panel rounded-xl shadow-2xl overflow-hidden z-20 w-44">
                  <button
                    onClick={() => { setShowMoreMenu(false); setShowReportModal(true); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-warning hover:bg-warning/10 transition flex items-center gap-2"
                  >
                    <Flag className="w-3.5 h-3.5" /> Report Event
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Title & Status */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-3xl md:text-4xl font-bold text-text flex-1 tracking-tight">{party.title}</h1>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full whitespace-nowrap ${getStatusClasses(party.status)}`}>
                {party.status}
              </span>
            </div>
            {/* #32 — Accessibility on capacity bar */}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 h-1.5 bg-surface-light rounded-full overflow-hidden" role="progressbar" aria-label={`${party.current_attendees} of ${party.max_capacity} spots filled`} aria-valuenow={capacityPercent} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-hot transition-all duration-500" style={{ width: `${capacityPercent}%` }} />
              </div>
              <span className="text-text-muted text-xs font-semibold whitespace-nowrap">
                {party.current_attendees}/{party.max_capacity} attending
              </span>
            </div>
          </div>

          {/* Key details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { icon: Calendar, label: "Date", value: new Date(party.date_time).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" }), sub: new Date(party.date_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), color: "text-primary" },
              { icon: MapPin, label: "Location", value: party.location_city, sub: party.location_name, color: "text-accent" },
              { icon: Ticket, label: "Entry", value: formatPrice(party.ticket_price), sub: party.ticket_price === 0 ? "No cover charge" : "Per person", color: "text-hot" },
              { icon: Shield, label: "Trust Gate", value: party.min_rating > 0 ? getTrustLevel(Number(party.min_rating), 1).name + "+" : "Open", sub: party.min_rating > 0 ? `${Number(party.min_rating).toFixed(1)}+ required` : "No restriction", color: "text-warning" },
            ].map((item) => (
              <div key={item.label} className="glass-panel rounded-2xl p-4">
                <item.icon className={`w-5 h-5 ${item.color} mb-2`} />
                <p className="text-text-dim text-[10px] uppercase tracking-wider font-bold mb-1">{item.label}</p>
                <p className="text-text text-sm font-bold">{item.value}</p>
                <p className="text-text-dim text-xs mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* About */}
          {party.description && (
            <div className="mb-8">
              <h2 className="text-base font-bold text-text mb-3 flex items-center gap-2">
                <PartyPopper className="w-4 h-4 text-primary" />
                About this Event
              </h2>
              <p className="text-text-muted leading-relaxed whitespace-pre-wrap text-sm glass-panel rounded-2xl p-5">{party.description}</p>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5" />
                Vibes
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="text-xs font-semibold text-accent bg-accent/10 border border-accent/15 px-3 py-1.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Host */}
          {party.host_display_name && (
            <div className="glass-panel rounded-2xl p-5 mb-8">
              <p className="text-[10px] uppercase tracking-[0.15em] text-text-dim font-bold mb-3">Hosted by</p>
              <div className="flex items-center gap-4">
                <Link to={`/profile/${party.host_id}`} className="shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-accent to-hot p-[2px] shadow-lg shadow-primary/20">
                    <div className="w-full h-full rounded-[14px] bg-bg overflow-hidden flex items-center justify-center text-white font-bold text-lg">
                      {party.host_avatar_url ? (
                        <img src={party.host_avatar_url} alt={party.host_display_name} className="w-full h-full object-cover" />
                      ) : (
                        party.host_display_name.charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                </Link>
                <div className="flex-1">
                  <Link to={`/profile/${party.host_id}`} className="text-text font-bold hover:text-primary transition block">{party.host_display_name}</Link>
                  <p className="text-text-muted text-xs flex items-center gap-1.5">
                    @{party.host_username}
                    {party.host_social_rating && party.host_social_rating > 0 && (
                      <span className="text-warning">· ★ {party.host_social_rating.toFixed(1)}</span>
                    )}
                  </p>
                </div>
                {isHost && (
                  <div className="flex gap-2 shrink-0">
                    {party.status === "upcoming" && (
                      <button
                        onClick={() => navigate(`/parties/${party.id}/edit`)}
                        className="btn-primary-luxe px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Event
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/dashboard/${party.id}/requests`)}
                      className="btn-secondary-luxe px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap"
                    >
                      Manage Requests
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attendees */}
          {attendees.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Attendees ({attendees.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {attendees.slice(0, 10).map((a) => (
                  <Link
                    key={a.id}
                    to={`/profile/${a.user_id}`}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px] hover:shadow-lg hover:shadow-primary/20 transition-shadow"
                    title={a.display_name || "Attendee"}
                  >
                    <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-text text-xs font-bold">
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt={a.display_name || "Attendee"} className="w-full h-full object-cover" />
                      ) : (
                        (a.display_name || "?").charAt(0).toUpperCase()
                      )}
                    </div>
                  </Link>
                ))}
                {attendees.length > 10 && (
                  <div className="w-10 h-10 rounded-full bg-surface-light border border-primary/10 flex items-center justify-center text-[10px] font-bold text-text-muted">
                    +{attendees.length - 10}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {/* Share toast */}
            {shareToast && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-success/90 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg"
              >
                {shareToast}
              </motion.div>
            )}

            {user && !isHost && (
              <>
                {error && <p className="text-error text-sm bg-error/10 border border-error/20 px-4 py-3 rounded-xl">{error}</p>}

                {alreadyAttending || requestStatus === "paid" ? (
                  <div className="glass-panel rounded-2xl p-5 border-success/20 border">
                    <p className="text-success font-bold text-center flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      You're on the guest list!
                    </p>
                  </div>
                ) : requestStatus === "approved" && party.ticket_price > 0 ? (
                  <button onClick={handlePay} disabled={paying} className="btn-primary-luxe w-full px-4 py-4 rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                    {paying ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <><Ticket className="w-4 h-4" />Buy Ticket · {formatPrice(party.ticket_price)}</>}
                  </button>
                ) : requestStatus === "approved" ? (
                  <div className="glass-panel rounded-2xl p-5 border-success/20 border">
                    <p className="text-success font-bold text-center flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" />Invite Accepted</p>
                  </div>
                ) : requestStatus === "pending" ? (
                  <div className="glass-panel rounded-2xl p-5 border-warning/20 border">
                    <p className="text-warning font-bold text-center flex items-center justify-center gap-2 mb-3"><Clock className="w-5 h-5" />Awaiting host approval</p>
                    <button
                      onClick={handleWithdraw}
                      disabled={withdrawing}
                      className="w-full text-error text-sm font-semibold py-2 rounded-xl border border-error/20 hover:bg-error/10 transition disabled:opacity-50 tap-active flex items-center justify-center gap-1.5"
                    >
                      {withdrawing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Withdrawing…</> : <><X className="w-3.5 h-3.5" />Withdraw Request</>}
                    </button>
                  </div>
                ) : !canRequestToJoin ? (
                  <div className="glass-panel rounded-2xl p-5 border-text-dim/10 border">
                    <p className="text-text-dim font-semibold text-center">Invites are closed for this event</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      placeholder="Write a message to the host..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, 300))}
                      maxLength={300}
                      rows={2}
                      aria-label="Message to the host"
                      className="input-luxe w-full rounded-2xl px-4 py-3.5 resize-none text-sm"
                    />
                    <button
                      onClick={handleJoinRequest}
                      disabled={requesting || isFull}
                      className="btn-primary-luxe w-full px-4 py-4 rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {requesting ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> 
                        : isFull ? "Event is Full"
                        : requestStatus === "rejected" || requestStatus === "withdrawn" ? <><Send className="w-4 h-4" />Request Again</>
                        : <><Send className="w-4 h-4" />Send Invite Request</>}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Action row */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate(`/parties/${party.id}/photos`)} className="btn-secondary-luxe px-4 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                <Camera className="w-4 h-4 text-accent" />
                Photos
              </button>
              {canRate ? (
                <button onClick={() => navigate(`/parties/${party.id}/rate`)} className="btn-secondary-luxe px-4 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 text-warning border-warning/20">
                  <Star className="w-4 h-4" />
                  Rate Crowd
                </button>
              ) : (
                <div className="btn-secondary-luxe px-4 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 opacity-40 cursor-not-allowed">
                  <Star className="w-4 h-4" />
                  Rate
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* REPORT MODAL */}
      {showReportModal && party && (
        <ReportModal
          targetType="party"
          targetId={party.id}
          targetName={party.title}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
