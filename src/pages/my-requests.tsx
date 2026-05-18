import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { PartyRequest } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Calendar, Loader2, Inbox, RefreshCw, Ticket,
  Clock, CheckCircle, XCircle, RotateCcw, Timer,
  TrendingUp, AlertCircle, ChevronRight, X, Trophy, Star,
} from "lucide-react";

type FilterTab = "all" | "pending" | "approved" | "rejected" | "withdrawn";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getCountdown(isoDate: string): { label: string; urgent: boolean } {
  const now = new Date();
  const target = new Date(isoDate);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { label: "Past", urgent: false };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days === 0) return { label: hours === 0 ? "Starting soon!" : `${hours}h away`, urgent: true };
  if (days === 1) return { label: "Tomorrow!", urgent: true };
  return { label: `${days} days away`, urgent: false };
}

function formatPrice(paisa: number) {
  if (!paisa || paisa === 0) return "Free";
  return `₹${(paisa / 100).toLocaleString("en-IN")}`;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
    barColor: "from-warning/60 to-warning/20",
    dot: true,
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
    barColor: "from-success/70 to-success/20",
    dot: false,
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    color: "text-error",
    bg: "bg-error/10",
    border: "border-error/20",
    barColor: "from-error/50 to-error/10",
    dot: false,
  },
  withdrawn: {
    label: "Withdrawn",
    icon: RotateCcw,
    color: "text-text-dim",
    bg: "bg-text-dim/10",
    border: "border-text-dim/15",
    barColor: "from-text-dim/30 to-text-dim/5",
    dot: false,
  },
} as const;

interface CardProps {
  req: PartyRequest;
  index: number;
  onWithdraw: (req: PartyRequest) => void;
  withdrawingId: string | null;
}

function RequestCard({ req, index, onWithdraw, withdrawingId }: CardProps) {
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.withdrawn;
  const StatusIcon = cfg.icon;

  const now = new Date();
  const partyDate = req.party_date_time ? new Date(req.party_date_time) : null;
  const isPast = partyDate ? partyDate < now : false;
  const isUpcoming = partyDate ? partyDate >= now : false;

  const canRate = req.status === "approved" && isPast;
  const showCountdown = req.status === "approved" && isUpcoming && !!partyDate;
  const canWithdraw = req.status === "pending";

  const countdown = showCountdown ? getCountdown(req.party_date_time!) : null;
  const isWithdrawing = withdrawingId === req.id;

  const r = req as PartyRequest & {
    party_cover_image_url?: string | null;
    party_ticket_price?: number;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -8 }}
      transition={{
        delay: Math.min(index * 0.045, 0.25),
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
      className={`relative overflow-hidden rounded-2xl border ${cfg.border} bg-surface shadow-lg group`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${cfg.barColor} rounded-l-2xl`} />

      {r.party_cover_image_url && (
        <div className="h-14 w-full overflow-hidden">
          <img
            src={r.party_cover_image_url}
            alt=""
            className="w-full h-full object-cover opacity-25 group-hover:opacity-35 transition-opacity duration-500"
            loading="lazy"
          />
        </div>
      )}

      <div className="pl-5 pr-4 pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/parties/${req.party_id}`} className="flex-1 min-w-0 group/link">
            <h3 className="text-text font-bold text-base leading-snug truncate group-hover/link:text-primary transition-colors">
              {req.party_title}
            </h3>
          </Link>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.border} border shrink-0`}>
            {cfg.dot && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
              </span>
            )}
            <StatusIcon className={`w-3 h-3 ${cfg.color}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-text-muted text-xs mt-2 flex-wrap">
          {req.party_location_city && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-accent shrink-0" />
              {req.party_location_city}
            </span>
          )}
          {req.party_date_time && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-primary shrink-0" />
              {formatDate(req.party_date_time)} · {formatTime(req.party_date_time)}
            </span>
          )}
          {r.party_ticket_price !== undefined && (
            <span className="flex items-center gap-1">
              <Ticket className="w-3 h-3 text-hot shrink-0" />
              {formatPrice(r.party_ticket_price)}
            </span>
          )}
        </div>

        {req.message && (
          <div className="mt-2.5 px-3 py-2 rounded-xl bg-surface-light border border-border text-text-muted text-xs italic leading-relaxed line-clamp-2">
            "{req.message}"
          </div>
        )}

        <div className="flex items-center gap-3 mt-2.5 text-[10px] text-text-dim flex-wrap">
          <span>Requested {formatDate(req.requested_at)}</span>
          {req.responded_at && (
            <span className={cfg.color}>· Responded {formatDate(req.responded_at)}</span>
          )}
        </div>

        {showCountdown && countdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-success/8 border border-success/20"
          >
            <div className="flex items-center gap-2">
              <Timer className={`w-4 h-4 ${countdown.urgent ? "text-warning animate-pulse" : "text-success"}`} />
              <span className={`text-sm font-bold ${countdown.urgent ? "text-warning" : "text-success"}`}>
                {countdown.label}
              </span>
            </div>
            <Link to={`/parties/${req.party_id}`} className="flex items-center gap-1 text-xs font-bold text-success hover:text-accent transition">
              View event <ChevronRight className="w-3 h-3" />
            </Link>
          </motion.div>
        )}

        {req.status === "approved" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3">
            <Link
              to={`/parties/${req.party_id}/ticket`}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary/15 to-accent/10 border border-primary/25 text-primary font-bold text-sm hover:from-primary/25 hover:to-accent/20 transition"
            >
              <Ticket className="w-4 h-4" />
              View Digital Ticket
            </Link>
          </motion.div>
        )}

        {canRate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3">
            <Link
              to={`/parties/${req.party_id}/rate`}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-warning/20 to-hot/15 border border-warning/25 text-warning font-bold text-sm hover:from-warning/30 hover:to-hot/25 transition"
            >
              <Trophy className="w-4 h-4" />
              Rate the crowd experience
              <Star className="w-3.5 h-3.5 fill-current" />
            </Link>
          </motion.div>
        )}

        {canWithdraw && (
          <div className="mt-3">
            <AnimatePresence mode="wait">
              {!confirmWithdraw ? (
                <motion.button
                  key="withdraw-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfirmWithdraw(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-text-dim/20 text-text-dim text-xs font-semibold hover:border-error/30 hover:text-error hover:bg-error/5 transition"
                >
                  <X className="w-3 h-3" />
                  Withdraw request
                </motion.button>
              ) : (
                <motion.div
                  key="confirm-row"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-xs text-text-muted flex-1">Withdraw this request?</span>
                  <button
                    onClick={() => setConfirmWithdraw(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-dim border border-border hover:bg-surface-light transition"
                  >
                    Keep
                  </button>
                  <button
                    onClick={() => { setConfirmWithdraw(false); onWithdraw(req); }}
                    disabled={isWithdrawing}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-error border border-error/30 bg-error/8 hover:bg-error/15 transition flex items-center gap-1"
                  >
                    {isWithdrawing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    Withdraw
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<PartyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState("");

  const loadRequests = useCallback((isRefresh = false) => {
    setLoadError("");
    if (isRefresh) setRefreshing(true);
    return api
      .get("/users/me/requests")
      .then((res) => setRequests(res.data.data.requests))
      .catch((err) => setLoadError(getApiErrorMessage(err, "Failed to load requests")))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    const withdrawn = requests.filter((r) => r.status === "withdrawn").length;
    const decided = approved + rejected;
    const successRate = decided > 0 ? Math.round((approved / decided) * 100) : null;
    const upcomingApproved = requests.filter(
      (r) => r.status === "approved" && r.party_date_time && new Date(r.party_date_time) >= new Date()
    ).length;
    return { total, pending, approved, rejected, withdrawn, successRate, upcomingApproved };
  }, [requests]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return requests;
    return requests.filter((r) => r.status === activeTab);
  }, [requests, activeTab]);

  const tabCounts: Record<FilterTab, number> = useMemo(
    () => ({
      all: requests.length,
      pending: stats.pending,
      approved: stats.approved,
      rejected: stats.rejected,
      withdrawn: stats.withdrawn,
    }),
    [requests.length, stats]
  );

  const handleWithdraw = useCallback(async (req: PartyRequest) => {
    setWithdrawError("");
    setWithdrawingId(req.id);
    try {
      await api.delete(`/parties/${req.party_id}/requests/${req.id}`);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === req.id ? { ...r, status: "withdrawn" as const, responded_at: new Date().toISOString() } : r
        )
      );
    } catch (err) {
      setWithdrawError(getApiErrorMessage(err, "Failed to withdraw request"));
    } finally {
      setWithdrawingId(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg pb-28 md:pb-12">
        <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-4">
          <div className="shimmer h-16 rounded-2xl" />
          <div className="shimmer h-24 rounded-2xl" />
          <div className="shimmer h-10 rounded-full" />
          {[0, 1, 2].map((i) => <div key={i} className="shimmer h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const TABS: { key: FilterTab; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending", icon: Clock },
    { key: "approved", label: "Approved", icon: CheckCircle },
    { key: "rejected", label: "Rejected", icon: XCircle },
    { key: "withdrawn", label: "Withdrawn", icon: RotateCcw },
  ];

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12 premium-shell">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1">Party Access</p>
            <h1 className="text-2xl font-bold text-text tracking-tight">My Requests</h1>
            <p className="text-text-dim text-sm mt-0.5">Track every invite you've submitted.</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => loadRequests(true)}
            disabled={refreshing}
            aria-label="Refresh"
            className="btn-secondary-luxe p-2.5 rounded-xl shrink-0 mt-1"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </motion.button>
        </motion.div>

        {requests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="grid grid-cols-4 gap-2.5 mb-5"
          >
            {[
              { label: "Total", value: stats.total, color: "text-text", iconColor: "text-primary" },
              { label: "Pending", value: stats.pending, color: "text-warning", icon: Clock, iconColor: "text-warning" },
              { label: "Approved", value: stats.approved, color: "text-success", icon: CheckCircle, iconColor: "text-success" },
              { label: "Win rate", value: stats.successRate !== null ? `${stats.successRate}%` : "—", color: "text-hot", icon: TrendingUp, iconColor: "text-hot" },
            ].map(({ label, value, color, icon: Icon, iconColor }) => (
              <div key={label} className="glass-panel rounded-xl p-3 text-center flex flex-col items-center gap-1">
                {Icon && <Icon className={`w-3.5 h-3.5 ${iconColor}`} />}
                <span className={`text-lg font-bold ${color} leading-none`}>{value}</span>
                <span className="text-[9px] font-semibold text-text-dim uppercase tracking-wide">{label}</span>
              </div>
            ))}
          </motion.div>
        )}

        {stats.upcomingApproved > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12 }}
            className="mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-success/10 to-accent/5 border border-success/20"
          >
            <div className="flex-1 min-w-0">
              <p className="text-success font-bold text-sm">
                {stats.upcomingApproved === 1 ? "You're in for 1 upcoming party!" : `You're in for ${stats.upcomingApproved} upcoming parties!`}
              </p>
              <p className="text-text-dim text-xs truncate">Check your approved requests below.</p>
            </div>
            <button
              onClick={() => setActiveTab("approved")}
              className="text-success text-xs font-bold flex items-center gap-0.5 hover:text-accent transition shrink-0"
            >
              View <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {(loadError || withdrawError) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-error/10 border border-error/25 rounded-xl p-3.5 text-error text-sm mb-5 flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {loadError || withdrawError}
            </span>
            {loadError && (
              <button onClick={() => loadRequests(true)} className="underline font-semibold text-xs whitespace-nowrap">Retry</button>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {TABS.map(({ key, label, icon: Icon }) => {
            const count = tabCounts[key];
            const isActive = activeTab === key;
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.93 }}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                    : "text-text-dim border-border bg-surface hover:text-text hover:border-border-hover"
                }`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                {label}
                {count > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-surface-light text-text-dim"}`}>
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface-light border border-border flex items-center justify-center mx-auto mb-4">
                {activeTab === "all" ? (
                  <Inbox className="w-7 h-7 text-text-dim" />
                ) : activeTab === "pending" ? (
                  <Clock className="w-7 h-7 text-warning/60" />
                ) : activeTab === "approved" ? (
                  <CheckCircle className="w-7 h-7 text-success/60" />
                ) : activeTab === "rejected" ? (
                  <XCircle className="w-7 h-7 text-error/60" />
                ) : (
                  <RotateCcw className="w-7 h-7 text-text-dim/60" />
                )}
              </div>
              <p className="text-text font-bold text-base mb-1">
                {activeTab === "all" ? "No requests yet" : `No ${activeTab} requests`}
              </p>
              <p className="text-text-muted text-sm mb-5">
                {activeTab === "all"
                  ? "Find a party you love and request to join it."
                  : activeTab === "approved"
                  ? "None of your requests have been approved yet."
                  : activeTab === "pending"
                  ? "You have no pending requests right now."
                  : `Nothing to show in the ${activeTab} tab.`}
              </p>
              {activeTab === "all" && (
                <Link to="/parties" className="inline-flex items-center btn-primary-luxe px-5 py-2.5 rounded-xl font-bold text-sm">
                  Discover parties
                </Link>
              )}
            </motion.div>
          ) : (
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {filtered.map((req, i) => (
                <RequestCard key={req.id} req={req} index={i} onWithdraw={handleWithdraw} withdrawingId={withdrawingId} />
              ))}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(filtered.length * 0.045 + 0.1, 0.5) }}
                className="pt-2"
              >
                <Link
                  to="/parties"
                  className="flex items-center justify-center py-3 rounded-2xl border border-border bg-surface text-text-dim text-sm font-semibold hover:text-text hover:border-border-hover transition"
                >
                  Discover more parties
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
