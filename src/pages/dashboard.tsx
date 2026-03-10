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

export default function DashboardPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/users/me/parties")
      .then((res) => setParties(res.data.data.parties))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text">Host Dashboard</h1>
            <p className="text-text-muted mt-1">Manage your parties</p>
          </div>
          <Link
            to="/parties/create"
            className="bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            + New Party
          </Link>
        </div>

        {parties.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-muted text-lg mb-4">You haven't hosted any parties yet</p>
            <Link to="/parties/create" className="text-primary hover:underline">
              Host your first party
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {parties.map((party) => (
              <div
                key={party.id}
                className="bg-surface rounded-xl border border-text-muted/10 p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Link to={`/parties/${party.id}`} className="text-text font-semibold hover:text-primary transition">
                      {party.title}
                    </Link>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      party.status === "upcoming" ? "bg-success/20 text-success" :
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

                {party.status === "upcoming" && (
                  <Link
                    to={`/dashboard/${party.id}/requests`}
                    className="bg-accent/20 hover:bg-accent/30 text-accent-hover font-semibold text-sm px-4 py-2 rounded-lg transition ml-4"
                  >
                    Requests
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
