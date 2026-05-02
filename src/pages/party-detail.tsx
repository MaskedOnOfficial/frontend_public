import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import type { Party, Attendee } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import { parseTags } from "../lib/parse-tags";
import { getTrustLevel } from "../lib/trust-levels";
import { ArrowLeft, MapPin, Calendar, Clock, Users, Star, Tag, Camera, Share2, Ticket, Shield, CheckCircle, Loader2, Send, PartyPopper, Edit3, MoreVertical, Flag, X, Lock, Copy, Leaf, Wine, Cigarette, AlertTriangle, EyeOff, MessageCircle, Megaphone } from "lucide-react";
import ReportModal from "../components/ReportModal";
import type { PartyAnnouncement } from "../types";

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
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcements, setAnnouncements] = useState<PartyAnnouncement[]>([]);
  const [announcementSending, setAnnouncementSending] = useState(false);
  const [conversationStarting, setConversationStarting] = useState(false);

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

  useEffect(() => {
    if (!party || !user) return;
    const canViewAnnouncements = party.host_id === user.id || requestStatus === "approved";
    if (!canViewAnnouncements) return;
    api.get(`/parties/${partyId}/announcements`)
      .then((res) => setAnnouncements(res.data.data.announcements || []))
      .catch(() => setAnnouncements([]));
  }, [party, partyId, requestStatus, user]);

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

  async function handleMessageHost() {
    if (!partyId) return;
    setConversationStarting(true);
    setError("");
    try {
      const res = await api.post("/messages/conversations", { party_id: partyId });
      navigate(`/messages/${res.data.data.conversation.id}`);
    } catch (messageError: unknown) {
      setError(getApiErrorMessage(messageError, "Unable to open message thread"));
    } finally {
      setConversationStarting(false);
    }
  }

  async function handlePostAnnouncement() {
    if (!partyId || !announcementBody.trim()) return;
    setAnnouncementSending(true);
    try {
      const res = await api.post(`/parties/${partyId}/announcements`, { body: announcementBody.trim() });
      setAnnouncements((prev) => [res.data.data.announcement, ...prev]);
      setAnnouncementBody("");
    } catch (announcementError: unknown) {
      setError(getApiErrorMessage(announcementError, "Failed to send announcement"));
    } finally {
      setAnnouncementSending(false);
    }
  }

  // Share state
  const [shareToast, setShareToast] = useState("");
  const shareTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [codeCopied, setCodeCopied] = useState(false);

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
              <h1 className="text-3xl md:text-4xl font-bold text-text flex-1 tracking-tight break-all [overflow-wrap:anywhere]">{party.title}</h1>
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
                <p className="text-text text-sm font-bold break-all [overflow-wrap:anywhere]">{item.value}</p>
                <p className="text-text-dim text-xs mt-0.5 break-all [overflow-wrap:anywhere]">{item.sub}</p>
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
              <p className="text-text-muted leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm glass-panel rounded-2xl p-5">{party.description}</p>
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

          {/* Food type + badges */}
          {(party.food_type || party.allow_photos === false) && (
            <div className="flex flex-wrap gap-2 mb-6">
              {party.food_type === "veg" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-success/10 text-success border border-success/20">
                  <Leaf className="w-3.5 h-3.5" /> Veg
                </span>
              )}
              {party.food_type === "non_veg" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-error/10 text-error border border-error/20">
                  🍖 Non-Veg
                </span>
              )}
              {party.food_type === "vegan" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                  <Leaf className="w-3.5 h-3.5" /> Vegan
                </span>
              )}
              {party.allow_photos === false && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-surface-light text-text-dim border border-border">
                  <EyeOff className="w-3.5 h-3.5" /> No Photo Uploads
                </span>
              )}
            </div>
          )}

          {/* Substance disclosures */}
          {(party.allows_alcohol || party.allows_smoking || party.allows_other_substances) && (
            <div className="mb-8 space-y-2">
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-warning/8 border border-warning/20">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-warning">Atmosphere Disclosure</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {party.allows_alcohol && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning/90 bg-warning/10 px-2.5 py-1 rounded-full border border-warning/20">
                        <Wine className="w-3 h-3" /> Alcohol
                      </span>
                    )}
                    {party.allows_smoking && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning/90 bg-warning/10 px-2.5 py-1 rounded-full border border-warning/20">
                        <Cigarette className="w-3 h-3" /> Smoking
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {party.allows_other_substances && (
                <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-error/8 border border-error/20">
                  <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-error/90 leading-relaxed">
                    Other substances may be present. 18+ advisory. Ensure compliance with local laws before attending.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Private code (host only) */}
          {isHost && party.is_private && party.private_code && (
            <div className="mb-8">
              <div className="glass-panel rounded-2xl p-5 border border-warning/20">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4 text-warning" />
                  <p className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em]">Private Access Code</p>
                </div>
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-xl font-mono font-bold text-warning tracking-[0.25em] py-2 px-4 bg-warning/8 rounded-xl border border-warning/15">
                    {party.private_code}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(party.private_code!).then(() => {
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      }).catch(() => {});
                    }}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-warning/10 text-warning text-xs font-bold border border-warning/20 hover:bg-warning/20 transition tap-active"
                  >
                    {codeCopied ? <><CheckCircle className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                  </button>
                </div>
                <p className="text-[11px] text-text-dim mt-2.5">Share this code only with guests you want to invite.</p>
              </div>
            </div>
          )}

          {/* Announcements */}
          {(isHost || requestStatus === "approved") && (
            <div className="mb-8">
              <div className="glass-panel rounded-2xl p-5 border border-accent/15">
                <div className="flex items-center gap-2 mb-4">
                  <Megaphone className="w-4 h-4 text-accent" />
                  <p className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em]">Party Announcements</p>
                </div>

                {isHost && (
                  <div className="mb-5 space-y-3">
                    <textarea
                      value={announcementBody}
                      onChange={(e) => setAnnouncementBody(e.target.value.slice(0, 2000))}
                      rows={3}
                      placeholder="Share an update with approved attendees..."
                      className="input-luxe w-full rounded-2xl px-4 py-3 resize-none text-sm"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handlePostAnnouncement}
                        disabled={announcementSending || !announcementBody.trim()}
                        className="btn-primary-luxe px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
                      >
                        {announcementSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Post update
                      </button>
                    </div>
                  </div>
                )}

                {announcements.length === 0 ? (
                  <p className="text-sm text-text-muted">No announcements yet.</p>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="rounded-2xl border border-border bg-bg/60 p-4">
                        <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">{announcement.body}</p>
                        <p className="text-[10px] text-text-dim mt-2">
                          {new Date(announcement.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Map — host always sees it; attendees see it on free events or after payment */}
          {party.latitude != null && party.longitude != null ? (
            (() => {
              const canSeeMap = isHost || party.ticket_price === 0 || requestStatus === "paid" || requestStatus === "approved";
              if (!canSeeMap) {
                return (
                  <div className="mb-8">
                    <div className="relative rounded-2xl overflow-hidden border border-border h-36 bg-surface-light flex items-center justify-center">
                      <div className="absolute inset-0 backdrop-blur-sm" />
                      <div className="relative text-center space-y-2">
                        <Lock className="w-6 h-6 text-text-dim mx-auto" />
                        <p className="text-xs font-semibold text-text-muted">Exact location revealed after ticket purchase</p>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div className="mb-8">
                  <h3 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    Location Map
                  </h3>
                  <div className="rounded-2xl overflow-hidden border border-border h-52">
                    <iframe
                      title="Party location"
                      width="100%"
                      height="100%"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${party.longitude - 0.005},${party.latitude - 0.005},${party.longitude + 0.005},${party.latitude + 0.005}&layer=mapnik&marker=${party.latitude},${party.longitude}`}
                      className="border-0"
                    />
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${party.latitude}&mlon=${party.longitude}&zoom=16`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[11px] text-text-dim hover:text-primary transition"
                  >
                    <MapPin className="w-3 h-3" /> Open in OpenStreetMap
                  </a>
                </div>
              );
            })()
          ) : party.ticket_price > 0 && !alreadyAttending && requestStatus !== "paid" && !isHost ? (
            <div className="mb-8">
              <div className="relative rounded-2xl overflow-hidden border border-border h-36 bg-surface-light flex items-center justify-center">
                <div className="absolute inset-0 backdrop-blur-sm" />
                <div className="relative text-center space-y-2">
                  <Lock className="w-6 h-6 text-text-dim mx-auto" />
                  <p className="text-xs font-semibold text-text-muted">Exact location revealed after ticket purchase</p>
                </div>
              </div>
            </div>
          ) : null}

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
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${party.host_id}`} className="text-text font-bold hover:text-primary transition block">{party.host_display_name}</Link>
                  <p className="text-text-muted text-xs flex items-center gap-1.5">
                    @{party.host_username}
                    {party.host_social_rating && party.host_social_rating > 0 && (
                      <span className="text-warning">· ★ {party.host_social_rating.toFixed(1)}</span>
                    )}
                  </p>
                </div>
              </div>
              {isHost && (
                <div className="flex gap-2 mt-4">
                  {party.status === "upcoming" && (
                    <button
                      onClick={() => navigate(`/parties/${party.id}/edit`)}
                      className="btn-primary-luxe flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Event
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/dashboard/${party.id}/requests`)}
                    className="btn-secondary-luxe flex-1 py-2.5 rounded-xl text-xs font-bold"
                  >
                    Manage Requests
                  </button>
                </div>
              )}
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
                    {user && !isHost && requestStatus && requestStatus !== "withdrawn" && (
                      <button
                        onClick={handleMessageHost}
                        disabled={conversationStarting}
                        className="btn-secondary-luxe w-full px-4 py-4 rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {conversationStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                        Message Host
                      </button>
                    )}
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
