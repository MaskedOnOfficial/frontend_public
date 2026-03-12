import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { PartyRequest, FriendUser } from "../types";

interface Props {
  request: PartyRequest;
  onAction?: (requestId: string, status: "approved" | "rejected") => Promise<void>;
  showMutuals?: boolean;
}

export default function RequestCard({ request, onAction, showMutuals = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [mutuals, setMutuals] = useState<FriendUser[]>([]);

  useEffect(() => {
    if (showMutuals && request.user_id) {
      api.get(`/friends/${request.user_id}/mutual`)
        .then((res) => setMutuals(res.data.data.mutuals || []))
        .catch(() => {});
    }
  }, [request.user_id, showMutuals]);

  const statusColors: Record<string, string> = {
    pending: "bg-warning/20 text-warning",
    approved: "bg-success/20 text-success",
    rejected: "bg-error/20 text-error",
    withdrawn: "bg-text-muted/20 text-text-muted",
  };

  async function handleAction(status: "approved" | "rejected") {
    if (!onAction) return;
    setLoading(true);
    try {
      await onAction(request.id, status);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface-light rounded-lg p-4 border border-text-muted/10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${request.user_id}`} className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold hover:opacity-80 transition">
              {request.avatar_url ? (
                <img
                  src={request.avatar_url}
                  alt={request.display_name || ""}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                (request.display_name || "?").charAt(0).toUpperCase()
              )}
            </div>
          </Link>
          <div>
            <Link
              to={`/profile/${request.user_id}`}
              className="text-text font-semibold text-sm hover:text-primary transition"
            >
              {request.display_name || request.username}
            </Link>
            <p className="text-text-muted text-xs">
              @{request.username} · ⭐ {request.social_rating?.toFixed(1) || "N/A"} · {request.parties_attended ?? 0} parties
            </p>
            {mutuals.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex -space-x-1">
                  {mutuals.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      className="w-4 h-4 rounded-full border border-surface-light bg-accent flex items-center justify-center text-[8px] text-white font-bold overflow-hidden"
                    >
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt={m.display_name} className="w-full h-full object-cover" />
                      ) : (
                        m.display_name.charAt(0).toUpperCase()
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-text-muted/70 text-[10px]">
                  {mutuals.length} mutual {mutuals.length === 1 ? "friend" : "friends"}
                </span>
              </div>
            )}
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${statusColors[request.status] || ""}`}>
          {request.status}
        </span>
      </div>

      {request.message && (
        <p className="text-text-muted text-sm mb-3 italic">"{request.message}"</p>
      )}

      {onAction && request.status === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={() => handleAction("approved")}
            disabled={loading}
            className="flex-1 bg-success/20 hover:bg-success/30 text-success font-semibold text-sm py-2 rounded transition disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => handleAction("rejected")}
            disabled={loading}
            className="flex-1 bg-error/20 hover:bg-error/30 text-error font-semibold text-sm py-2 rounded transition disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
