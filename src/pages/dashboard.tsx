import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { Party } from "../types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PartyRow({ party }: { party: Party }) {
  return (
    <div className="glass-panel rounded-xl p-4 flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <Link to={`/parties/${party.id}`} className="text-text font-semibold hover:text-primary transition">
            {party.title}
          </Link>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
            party.status === "upcoming" ? "bg-success/20 text-success" :
            party.status === "ongoing" ? "bg-primary/20 text-primary" :
            party.status === "cancelled" ? "bg-error/20 text-error" :
            party.status === "completed" ? "bg-accent/20 text-accent-hover" :
            "bg-text-muted/20 text-text-muted"
          }`}>
            {party.status}
          </span>
        </div>
        <p className="text-text-muted text-sm mt-1">
          📅 {formatDate(party.date_time)} · 📍 {party.location_city} · 👥 {party.current_attendees}/{party.max_capacity}
        </p>
      </div>
      <div className="flex items-center gap-2 ml-4 shrink-0">
        {party.status === "upcoming" && (
          <Link
            to={`/dashboard/${party.id}/requests`}
            className="btn-secondary-luxe font-semibold text-sm px-4 py-2 rounded-lg transition"
          >
            Requests
          </Link>
        )}
        {party.status !== "cancelled" && new Date(party.date_time) < new Date() && (
          <Link
            to={`/parties/${party.id}/rate`}
            className="bg-warning/10 hover:bg-warning/20 text-warning font-semibold text-sm px-4 py-2 rounded-lg border border-warning/20 transition"
          >
            ⭐ Rate
          </Link>
        )}
      </div>
    </div>
  );
}

function isPartyActive(party: Party): boolean {
  // A party is "active" if it's upcoming/ongoing and its date hasn't passed
  if (party.status === "cancelled" || party.status === "completed" || party.status === "archived") return false;
  // Also treat parties whose date has passed as inactive even if status wasn't updated
  if (new Date(party.date_time) < new Date() && party.status === "upcoming") return false;
  return true;
}

export default function DashboardPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    api.get("/users/me/parties")
      .then((res) => setParties(res.data.data.parties))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeParties = parties.filter(isPartyActive);
  const pastParties = parties.filter((p) => !isPartyActive(p));

  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="glass-panel rounded-2xl p-6 flex-1">
            <h1 className="text-3xl font-bold text-text">Host Dashboard</h1>
            <p className="text-text-muted mt-1">Manage your parties with confidence.</p>
          </div>
          <div className="ml-4">
            <Link
              to="/parties/create"
              className="btn-primary-luxe font-semibold px-6 py-3 rounded-lg transition block text-center"
            >
              + New Party
            </Link>
          </div>
        </div>

        {parties.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-muted text-lg mb-4">You haven't hosted any parties yet</p>
            <Link to="/parties/create" className="text-primary hover:underline">
              Host your first party
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Parties */}
            <div>
              <h2 className="text-lg font-semibold text-text mb-3">Active Parties</h2>
              {activeParties.length === 0 ? (
                <p className="text-text-muted text-sm">No active parties. <Link to="/parties/create" className="text-primary hover:underline">Host one?</Link></p>
              ) : (
                <div className="space-y-3">
                  {activeParties.map((party) => (
                    <PartyRow key={party.id} party={party} />
                  ))}
                </div>
              )}
            </div>

            {/* Past Parties */}
            {pastParties.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPast((v) => !v)}
                  className="flex items-center gap-2 text-text-muted hover:text-text transition mb-3"
                >
                  <span className="text-lg font-semibold">Past Parties</span>
                  <span className="text-xs bg-text-muted/20 px-2 py-0.5 rounded-full">{pastParties.length}</span>
                  <span className="text-xs">{showPast ? "▲" : "▼"}</span>
                </button>
                {showPast && (
                  <div className="space-y-3 opacity-60">
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
