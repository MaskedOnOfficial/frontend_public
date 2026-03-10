import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import type { PartyRequest } from "../types";
import RequestCard from "../components/request-card";

export default function ManageRequestsPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const [requests, setRequests] = useState<PartyRequest[]>([]);
  const [partyTitle, setPartyTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [partyId]);

  async function loadData() {
    try {
      const [reqsRes, partyRes] = await Promise.all([
        api.get(`/parties/${partyId}/requests`),
        api.get(`/parties/${partyId}`),
      ]);
      setRequests(reqsRes.data.data.requests);
      setPartyTitle(partyRes.data.data.party.title);
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(requestId: string, status: "approved" | "rejected") {
    await api.patch(`/parties/${partyId}/requests/${requestId}`, { status });
    // Refresh list
    const res = await api.get(`/parties/${partyId}/requests`);
    setRequests(res.data.data.requests);
  }

  const filtered = filter
    ? requests.filter((r) => r.status === filter)
    : requests;

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/dashboard" className="text-text-muted hover:text-text text-sm mb-4 inline-block">
          ← Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-text mb-1">Join Requests</h1>
        <p className="text-text-muted mb-6">{partyTitle} · {pendingCount} pending</p>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {["", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm px-4 py-2 rounded-lg transition ${
                filter === f
                  ? "bg-primary text-white"
                  : "bg-surface text-text-muted hover:text-text"
              }`}
            >
              {f || "All"} {f === "pending" && pendingCount > 0 ? `(${pendingCount})` : ""}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-text-muted text-center py-10">No requests found</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => (
              <RequestCard key={req.id} request={req} onAction={handleAction} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
