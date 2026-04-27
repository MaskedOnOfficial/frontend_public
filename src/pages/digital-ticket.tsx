import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calendar, MapPin, Ticket, CheckCircle2, Clock,
  AlertCircle, Star, Users, Tag, Hash, Loader2, IndianRupee,
} from "lucide-react";
import type { PartyRequest } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatPrice(paisa: number) {
  if (!paisa || paisa === 0) return "Free";
  return `\u20b9${(paisa / 100).toLocaleString("en-IN")}`;
}

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 12).toUpperCase();
}

// ─── Barcode Visual ───────────────────────────────────────────────────────────

const BAR_PATTERN = [3,1,2,1,3,2,1,3,1,2,3,1,2,1,3,1,2,3,1,2,1,3,2,1,3,1,2,1,3,2];

function BarcodeVisual({ ticketId }: { ticketId: string }) {
  const chars = ticketId.replace(/-/g, "");
  const bars = BAR_PATTERN.map((base: number, i: number) => {
    const c = chars.charCodeAt(i % chars.length) % 3;
    return base + c;
  });

  // Build SVG bars
  let x = 0;
  const svgBars: { x: number; w: number; h: number }[] = [];
  bars.forEach((w: number, i: number) => {
    if (i % 2 === 0) {
      svgBars.push({ x, w, h: 40 + (i % 3) * 8 });
    }
    x += w + 2;
  });
  const totalW = x;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={totalW} height={56} aria-label="Ticket barcode">
        {svgBars.map((bar, i) => (
          <rect
            key={i}
            x={bar.x}
            y={56 - bar.h}
            width={bar.w}
            height={bar.h}
            rx={1}
            className="fill-text"
          />
        ))}
      </svg>
      <p className="font-mono text-[10px] tracking-[0.3em] text-text-dim">{shortId(ticketId)}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DigitalTicketPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState<PartyRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/users/me/requests");
      const all: PartyRequest[] = res.data.data.requests;
      const found = all.find((r) => r.id === requestId);
      if (!found) {
        setError("Ticket not found. This request may not belong to your account.");
      } else {
        setRequest(found);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load ticket"));
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle className="w-10 h-10 text-error" />
        <p className="text-text font-bold">{error || "Ticket not found"}</p>
        <button onClick={() => navigate(-1)} className="btn-primary-luxe px-5 py-2.5 rounded-xl text-sm font-bold">
          Go back
        </button>
      </div>
    );
  }

  if (request.status !== "approved") {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-4 text-center pb-28 md:pb-0">
        <Ticket className="w-10 h-10 text-text-dim" />
        <p className="text-text font-bold text-lg">No ticket yet</p>
        <p className="text-text-dim text-sm max-w-xs">
          Your request is <span className="font-bold capitalize">{request.status}</span>. A digital ticket is only available for approved requests.
        </p>
        <Link to="/my-requests" className="btn-primary-luxe px-5 py-2.5 rounded-xl text-sm font-bold">My Requests</Link>
      </div>
    );
  }

  const isUpcoming = request.party_date_time ? new Date(request.party_date_time) > new Date() : false;
  const tags = request.party_tags ? request.party_tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12 premium-shell">
      <div className="max-w-sm mx-auto px-4 py-6 md:py-10">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
          <Link
            to="/my-requests"
            className="flex items-center gap-1.5 text-text-dim hover:text-text text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            My Requests
          </Link>
        </motion.div>

        {/* Ticket */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          {/* Cover banner */}
          {request.party_cover_image_url && (
            <div className="h-28 w-full rounded-t-3xl overflow-hidden">
              <img
                src={request.party_cover_image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Main ticket body */}
          <div className={`relative bg-surface border border-border shadow-2xl ${request.party_cover_image_url ? "rounded-b-none rounded-t-none" : "rounded-t-3xl"}`}>

            {/* Gradient accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-hot" />

            {/* Header */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Digital Ticket</p>
                  <h1 className="text-xl font-black text-text leading-tight">{request.party_title}</h1>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5 bg-success/15 border border-success/25 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    <span className="text-[10px] font-black text-success uppercase tracking-wider">Approved</span>
                  </div>
                  {isUpcoming && (
                    <span className="flex items-center gap-1 text-[9px] text-warning font-bold">
                      <Clock className="w-2.5 h-2.5 animate-pulse" /> Upcoming
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="px-5 pb-4 grid grid-cols-2 gap-3">
              {request.party_date_time && (
                <div className="bg-surface-light rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3 h-3 text-primary" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-dim">Date</span>
                  </div>
                  <p className="text-xs font-bold text-text leading-snug">{formatDate(request.party_date_time)}</p>
                </div>
              )}
              {request.party_date_time && (
                <div className="bg-surface-light rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3 h-3 text-accent" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-dim">Time</span>
                  </div>
                  <p className="text-xl font-black text-text">{formatTime(request.party_date_time)}</p>
                </div>
              )}
              {request.party_location_city && (
                <div className="bg-surface-light rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3 h-3 text-hot" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-dim">Location</span>
                  </div>
                  <p className="text-xs font-bold text-text">{request.party_location_city}</p>
                </div>
              )}
              {request.party_ticket_price !== undefined && (
                <div className="bg-surface-light rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <IndianRupee className="w-3 h-3 text-success" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-dim">Entry</span>
                  </div>
                  <p className="text-xl font-black text-text">{formatPrice(request.party_ticket_price)}</p>
                </div>
              )}
            </div>

            {/* Attendee info */}
            <div className="px-5 pb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {(user?.display_name ?? "G").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text truncate">{user?.display_name ?? "Guest"}</p>
                <p className="text-[10px] text-text-dim truncate">@{user?.username ?? ""}</p>
              </div>
              {(user?.social_rating ?? 0) > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                  <span className="text-xs font-bold text-warning">{(user!.social_rating).toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 text-[9px] font-bold bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">
                    <Tag className="w-2.5 h-2.5" /> {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Dashed tear line */}
            <div className="relative flex items-center px-4 my-1">
              <div className="w-5 h-5 rounded-full bg-bg border border-border absolute -left-2.5" />
              <div className="flex-1 border-t-2 border-dashed border-border" />
              <div className="w-5 h-5 rounded-full bg-bg border border-border absolute -right-2.5" />
            </div>

            {/* Ticket stub */}
            <div className="px-5 py-4 flex flex-col items-center gap-3">
              {/* Capacity indicator */}
              {request.party_max_capacity && (
                <div className="flex items-center gap-1.5 text-[10px] text-text-dim">
                  <Users className="w-3 h-3" />
                  <span>{request.party_current_attendees ?? 0} / {request.party_max_capacity} attending</span>
                </div>
              )}

              {/* Barcode */}
              <BarcodeVisual ticketId={request.id} />

              {/* Ticket number */}
              <div className="flex items-center gap-1.5 text-[9px] text-text-dim">
                <Hash className="w-2.5 h-2.5" />
                Ticket ID: <span className="font-mono text-[9px]">{shortId(request.id)}</span>
              </div>
            </div>
          </div>

          {/* Bottom rounded cap */}
          <div className="h-3 bg-surface border-x border-b border-border rounded-b-3xl" />
        </motion.div>

        {/* View party link */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 space-y-3"
        >
          <Link
            to={`/parties/${request.party_id}`}
            className="btn-secondary-luxe w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
          >
            View Event
          </Link>
          <p className="text-center text-[10px] text-text-dim">
            Present this ticket at the entrance. Request ID is your proof of admission.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
