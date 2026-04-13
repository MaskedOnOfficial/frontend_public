import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import type { Party } from "../types";
import { motion } from "framer-motion";
import { Plus, Calendar, MapPin, Users, Star, ChevronDown, ChevronUp, LayoutDashboard, Loader2, PartyPopper } from "lucide-react";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClasses(status: string) {
  switch (status) {
    case "upcoming": return "status-upcoming";
    case "ongoing": return "status-ongoing";
    case "completed": return "status-completed";
    default: return "status-cancelled";
  }
}

function PartyRow({ party }: { party: Party }) {
  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <Link to={`/parties/${party.id}`} className="text-text font-bold hover:text-primary transition truncate">
            {party.title}
          </Link>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${getStatusClasses(party.status)}`}>
            {party.status}
          </span>
        </div>
        <div className="flex items-center gap-4 text-text-muted text-xs">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-primary" />{formatDate(party.date_time)}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-accent" />{party.location_city}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{party.current_attendees}/{party.max_capacity}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {party.status === "upcoming" && (
          <Link
            to={`/dashboard/${party.id}/requests`}
            className="btn-secondary-luxe font-bold text-xs px-4 py-2.5 rounded-xl"
          >
            Manage Requests
          </Link>
        )}
        {party.status !== "cancelled" && new Date(party.date_time) < new Date() && (
          <Link
            to={`/parties/${party.id}/rate`}
            className="bg-warning/10 hover:bg-warning/20 text-warning font-bold text-xs px-4 py-2.5 rounded-xl border border-warning/15 transition flex items-center gap-1.5"
          >
            <Star className="w-3.5 h-3.5" />
            Rate
          </Link>
        )}
      </div>
    </div>
  );
}

function isPartyActive(party: Party): boolean {
  if (party.status === "cancelled" || party.status === "completed" || party.status === "archived") return false;
  if (new Date(party.date_time) < new Date() && party.status === "upcoming") return false;
  return true;
}

export default function DashboardPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api.get("/users/me/parties")
      .then((res) => setParties(res.data.data.parties))
      .catch((err) => {
        setLoadError(getApiErrorMessage(err, "Failed to load your parties"));
      })
      .finally(() => setLoading(false));
  }, []);

  const activeParties = parties.filter(isPartyActive);
  const pastParties = parties.filter((p) => !isPartyActive(p));

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8"
        >
          <div className="glass-panel rounded-2xl p-6 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-text tracking-tight">Host Dashboard</h1>
                <p className="text-text-muted text-sm">Manage your parties & requests</p>
              </div>
            </div>
            {/* Stats */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-primary/[0.06]">
              <div>
                <p className="text-2xl font-bold text-primary">{activeParties.length}</p>
                <p className="text-text-dim text-[10px] uppercase tracking-wider font-bold">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-muted">{pastParties.length}</p>
                <p className="text-text-dim text-[10px] uppercase tracking-wider font-bold">Past</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{parties.length}</p>
                <p className="text-text-dim text-[10px] uppercase tracking-wider font-bold">Total</p>
              </div>
            </div>
          </div>
          <Link
            to="/parties/create"
            className="btn-primary-luxe font-bold px-6 py-3.5 rounded-xl flex items-center gap-2 justify-center whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            New Party
          </Link>
        </motion.div>

        {loadError && (
          <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error text-sm mb-6 flex items-center justify-between">
            <span>{loadError}</span>
            <button onClick={() => { setLoadError(""); setLoading(true); api.get("/users/me/parties").then((res) => setParties(res.data.data.parties)).catch((err) => setLoadError(getApiErrorMessage(err, "Failed to load your parties"))).finally(() => setLoading(false)); }} className="underline ml-2 font-semibold">Retry</button>
          </div>
        )}

        {parties.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-light flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="w-8 h-8 text-text-dim" />
            </div>
            <p className="text-text-muted text-lg font-semibold mb-2">No parties yet</p>
            <Link to="/parties/create" className="text-primary hover:text-accent transition font-semibold">
              Host your first party →
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Active */}
            <div>
              <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Active Parties
              </h2>
              {activeParties.length === 0 ? (
                <p className="text-text-muted text-sm glass-panel rounded-xl p-4">
                  No active parties.{" "}
                  <Link to="/parties/create" className="text-primary hover:text-accent transition font-semibold">Host one?</Link>
                </p>
              ) : (
                <div className="space-y-3">
                  {activeParties.map((party, i) => (
                    <motion.div key={party.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <PartyRow party={party} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Past */}
            {pastParties.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPast((v) => !v)}
                  className="flex items-center gap-2 text-text-muted hover:text-text transition mb-3 group"
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Past Parties</span>
                  <span className="text-[10px] bg-surface-light px-2.5 py-1 rounded-full font-bold">{pastParties.length}</span>
                  {showPast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showPast && (
                  <div className="space-y-3 opacity-70">
                    {pastParties.map((party) => (
                      <PartyRow key={party.id} party={party} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
