import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import type { Notification } from "../types";
import { getApiErrorMessage } from "../lib/errors";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const limit = 20;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications", { params: { page, limit } });
      setNotifications(res.data.data.notifications);
      setTotal(res.data.data.total);
      setUnread(res.data.data.unread);
    } catch (error) {
      console.error("Failed to fetch notifications:", getApiErrorMessage(error, "Unknown notification error"));
    } finally {
      setLoading(false);
    }
  }, [limit, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
    );
    setUnread((u) => Math.max(0, u - 1));
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnread(0);
  }

  function handleClick(n: Notification) {
    if (!n.is_read) markRead(n.id);
    if (n.reference_type === "party" && n.reference_id) {
      navigate(`/parties/${n.reference_id}`);
    }
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
        <p className="text-text-muted">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="glass-panel rounded-2xl p-5 flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text">Notifications <span className="brand-gradient-text text-sm font-normal">{unread > 0 ? `(${unread} unread)` : ""}</span></h1>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="btn-secondary-luxe text-sm px-3 py-1.5 rounded-lg transition"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-muted text-lg">No notifications yet</p>
            <p className="text-text-muted/60 text-sm mt-2">
              You'll be notified about party updates, requests, and more
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left p-4 rounded-lg border transition ${
                  n.is_read
                    ? "glass-panel border-white/8 hover:border-white/15"
                    : "glass-panel border-primary/30 hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <p className="text-text font-medium text-sm truncate">
                        {n.title}
                      </p>
                    </div>
                    {n.body && (
                      <p className="text-text-muted text-sm mt-1 line-clamp-2">
                        {n.body}
                      </p>
                    )}
                  </div>
                  <span className="text-text-muted/60 text-xs flex-shrink-0">
                    {timeAgo(n.created_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary-luxe px-3 py-1.5 text-sm rounded disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-3 py-1.5 text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary-luxe px-3 py-1.5 text-sm rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
