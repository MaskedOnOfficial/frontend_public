import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { PartyRequest } from "../types";
import { motion } from "framer-motion";
import { MapPin, Calendar, Star, Send, Loader2, Inbox, RefreshCw } from "lucide-react";

const statusStyles: Record<string, string> = {
  pending: "status-upcoming",
  approved: "status-ongoing",
  rejected: "bg-error/15 text-error",
  withdrawn: "bg-text-dim/15 text-text-dim",
};

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<PartyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  function loadRequests() {
    return api.get("/users/me/requests")
      .then((res) => setRequests(res.data.data.requests))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => {
    loadRequests();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-hot flex items-center justify-center shadow-lg shadow-primary/20">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text tracking-tight">My Requests</h1>
              <p className="text-text-muted text-sm">Track every invite you have requested.</p>
            </div>
            <button
              onClick={() => { setRefreshing(true); loadRequests(); }}
              disabled={refreshing}
              aria-label="Refresh requests"
              className="btn-secondary-luxe p-2.5 rounded-xl ml-auto shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </motion.div>

        {requests.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-surface-light flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-text-dim" />
            </div>
            <p className="text-text-muted text-lg font-semibold mb-2">No join requests yet</p>
            <Link to="/parties" className="text-primary hover:text-accent transition font-semibold">
              Discover parties to join →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req, i) => {
              const partyIsPast = req.party_date_time ? new Date(req.party_date_time) < new Date() : false;
              const canRate = req.status === "approved" && partyIsPast;
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  className="glass-panel rounded-2xl p-5 hover:border-primary/10 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <Link to={`/parties/${req.party_id}`} className="text-text font-bold hover:text-primary transition block truncate">
                        {req.party_title}
                      </Link>
                      <div className="flex items-center gap-3 text-text-muted text-xs mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-accent" />
                          {req.party_location_city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-primary" />
                          {req.party_date_time
                            ? new Date(req.party_date_time).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                            : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {canRate && (
                        <Link
                          to={`/parties/${req.party_id}/rate`}
                          className="bg-warning/10 hover:bg-warning/20 text-warning font-bold text-xs px-3 py-1.5 rounded-xl border border-warning/15 transition flex items-center gap-1"
                        >
                          <Star className="w-3 h-3 fill-current" />
                          Rate
                        </Link>
                      )}
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusStyles[req.status] || ""}`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
