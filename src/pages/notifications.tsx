import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import type { Notification } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import { Bell, CheckCheck, PartyPopper, UserPlus, Star, Heart, MessageCircle, Loader2, ChevronLeft, ChevronRight, ChevronRight as ArrowRight, Inbox } from "lucide-react";

function getNotifIcon(type: string) {
  if (type.includes("request")) return <UserPlus className="w-5 h-5 text-accent" />;
  if (type.includes("approved")) return <PartyPopper className="w-5 h-5 text-success" />;
  if (type.includes("rejected")) return <Inbox className="w-5 h-5 text-error" />;
  if (type.includes("rating")) return <Star className="w-5 h-5 text-warning" />;
  if (type.includes("like") || type.includes("photo")) return <Heart className="w-5 h-5 text-hot" />;
  if (type.includes("friend")) return <UserPlus className="w-5 h-5 text-primary" />;
  if (type.includes("comment")) return <MessageCircle className="w-5 h-5 text-accent" />;
  return <Bell className="w-5 h-5 text-primary" />;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const limit = 20;

  const fetchNotifications = useCallback(async () => {
    setFetchError("");
    try {
      const res = await api.get("/notifications", { params: { page, limit } });
      setNotifications(res.data.data.notifications);
      setTotal(res.data.data.total);
      setUnread(res.data.data.unread);
    } catch (error) {
      setFetchError(getApiErrorMessage(error, "Failed to load notifications"));
    } finally {
      setLoading(false);
    }
  }, [limit, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnread((u) => Math.max(0, u - 1));
    } catch (error) {
      console.error("Failed to mark notification read:", getApiErrorMessage(error, "Unknown error"));
    }
  }

  async function markAllRead() {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnread(0);
    } catch (error) {
      console.error("Failed to mark all read:", getApiErrorMessage(error, "Unknown error"));
    }
  }

  function getNotifLink(n: Notification): string | null {
    const { type, reference_type, reference_id } = n;

    // Friend notifications — reference_id is the other user's ID
    if (type === "friend_request" && reference_id) return `/profile/${reference_id}`;
    if (type === "friend_accepted" && reference_id) return `/profile/${reference_id}`;

    // Rating → own profile
    if (type === "new_rating") return "/profile/me";

    // Photo interactions → own profile (photos tab)
    if ((type === "photo_liked" || type === "photo_commented") && reference_id) return "/profile/me";

    // Party notifications
    if (reference_type === "party" && reference_id) {
      // Host receives join_request → go to manage-requests page
      if (type === "join_request") return `/dashboard/${reference_id}/requests`;
      // Everything else (request_approved, request_rejected, payment_confirmed, etc.) → party detail
      return `/parties/${reference_id}`;
    }

    return null;
  }

  function handleClick(n: Notification) {
    if (!n.is_read) markRead(n.id);
    const link = getNotifLink(n);
    if (link) navigate(link);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-6 md:py-8 px-4 pb-28 md:pb-12">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-5 flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-hot flex items-center justify-center shadow-lg shadow-primary/20">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text tracking-tight">Notifications</h1>
              {unread > 0 && <p className="text-hot text-xs font-semibold">{unread} unread</p>}
            </div>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="btn-secondary-luxe text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </motion.div>

        {fetchError && (
          <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error text-sm mb-6 flex items-center justify-between">
            <span>{fetchError}</span>
            <button onClick={fetchNotifications} className="underline ml-2 font-semibold">Retry</button>
          </div>
        )}

        {notifications.length === 0 && !fetchError ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-surface-light flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-text-dim" />
            </div>
            <p className="text-text-muted text-lg font-semibold mb-2">No notifications yet</p>
            <p className="text-text-dim text-sm">You'll be notified about party updates, requests, and more</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n, i) => (
              <motion.button
                key={n.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => handleClick(n)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(n); } }}
                role="button"
                tabIndex={0}
                aria-label={`${n.is_read ? "" : "Unread: "}${n.title}`}
              className={`w-full text-left p-4 rounded-2xl border transition-all tap-active focus-visible:ring-2 focus-visible:ring-primary/40 outline-none ${
                  getNotifLink(n) ? "hover:translate-x-1 cursor-pointer" : "cursor-default"
                } ${
                  n.is_read
                    ? "glass-panel border-primary/[0.05] hover:border-primary/10"
                    : "glass-panel border-primary/20 hover:border-primary/30 bg-primary/[0.03]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.is_read ? "bg-surface-light" : "bg-primary/10"}`}>
                    {getNotifIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/50 shrink-0 animate-pulse" />
                      )}
                      <p className={`text-sm truncate ${n.is_read ? "text-text-muted font-medium" : "text-text font-bold"}`}>
                        {n.title}
                      </p>
                    </div>
                    {n.body && (
                      <p className="text-text-dim text-xs mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                  </div>
                  <span className="text-text-dim text-[10px] font-semibold shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                  {getNotifLink(n) && (
                    <ArrowRight className="w-3.5 h-3.5 text-text-dim/40 shrink-0 mt-0.5" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="btn-secondary-luxe p-2.5 rounded-xl disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-text-muted text-sm font-semibold">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className="btn-secondary-luxe p-2.5 rounded-xl disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
