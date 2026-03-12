import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { PartyRequest } from "../types";

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<PartyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/users/me/requests")
      .then((res) => setRequests(res.data.data.requests))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = {
    pending: "bg-warning/20 text-warning",
    approved: "bg-success/20 text-success",
    rejected: "bg-error/20 text-error",
    withdrawn: "bg-text-muted/20 text-text-muted",
  };

  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text mb-8">My Requests</h1>

        {requests.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-muted text-lg mb-4">No join requests yet</p>
            <Link to="/parties" className="text-primary hover:underline">
              Discover parties to join
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const partyIsPast = req.party_date_time ? new Date(req.party_date_time) < new Date() : false;
              const canRate = req.status === "approved" && partyIsPast;
              return (
                <div
                  key={req.id}
                  className="bg-surface rounded-xl border border-text-muted/10 p-4 hover:border-primary/30 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Link to={`/parties/${req.party_id}`} className="text-text font-semibold hover:text-primary transition">
                        {req.party_title}
                      </Link>
                      <p className="text-text-muted text-sm mt-1">
                        📍 {req.party_location_city} · 📅{" "}
                        {req.party_date_time
                          ? new Date(req.party_date_time).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {canRate && (
                        <Link
                          to={`/parties/${req.party_id}/rate`}
                          className="bg-warning/10 hover:bg-warning/20 text-warning font-semibold text-xs px-3 py-1.5 rounded-lg border border-warning/20 transition"
                        >
                          ⭐ Rate
                        </Link>
                      )}
                      <span className={`text-xs font-semibold px-3 py-1 rounded ${statusColors[req.status] || ""}`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
