import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { Party } from "../types";
import PartyCard from "../components/party-card";

export default function DiscoverPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);
  const limit = 12;

  useEffect(() => {
    fetchParties();
  }, [page]);

  async function fetchParties() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (city) params.set("city", city);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await api.get(`/parties?${params.toString()}`);
      setParties(res.data.data.parties);
      setTotal(res.data.data.total);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchParties();
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text">Discover Parties</h1>
            <p className="text-text-muted mt-1">Find your next vibe</p>
          </div>
          <Link
            to="/parties/create"
            className="bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            + Host a Party
          </Link>
        </div>

        {/* Search & filters */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <input
            type="text"
            placeholder="Search parties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-surface border border-text-muted/20 text-text rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-40 bg-surface border border-text-muted/20 text-text rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            Search
          </button>
        </form>

        {/* Party grid */}
        {loading ? (
          <div className="text-center text-text-muted py-20">Loading...</div>
        ) : parties.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-muted text-lg mb-4">No parties found</p>
            <Link to="/parties/create" className="text-primary hover:underline">
              Be the first to host one!
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {parties.map((party) => (
                <PartyCard key={party.id} party={party} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="bg-surface text-text px-4 py-2 rounded-lg disabled:opacity-30"
                >
                  Prev
                </button>
                <span className="text-text-muted px-4 py-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="bg-surface text-text px-4 py-2 rounded-lg disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
