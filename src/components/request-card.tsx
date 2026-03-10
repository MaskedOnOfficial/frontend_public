import { useState } from "react";
import type { PartyRequest } from "../types";

interface Props {
  request: PartyRequest;
  onAction?: (requestId: string, status: "approved" | "rejected") => Promise<void>;
}

export default function RequestCard({ request, onAction }: Props) {
  const [loading, setLoading] = useState(false);

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
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">
            {(request.display_name || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-text font-semibold text-sm">{request.display_name || request.username}</p>
            <p className="text-text-muted text-xs">
              @{request.username} · ⭐ {request.social_rating?.toFixed(1) || "N/A"} · {request.parties_attended ?? 0} parties
            </p>
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
