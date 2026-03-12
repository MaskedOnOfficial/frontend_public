import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../lib/api";
import type { Party } from "../types";

type SearchUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  social_rating: number;
};

type SearchResults = {
  users: SearchUser[];
  parties: Party[];
  query: string;
};

type Tab = "all" | "users" | "parties";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `₹${(price / 100).toLocaleString("en-IN")}`;
}

function parseTags(tags: string | string[] | null): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try { return JSON.parse(tags); } catch { return []; }
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [inputValue, setInputValue] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("all");

  const debouncedQuery = useDebounce(inputValue, 350);

  // Load initial query on mount
  useEffect(() => {
    if (initialQuery.length >= 2) {
      setLoading(true);
      api
        .get("/search", { params: { q: initialQuery, limit: 20 } })
        .then((r) => setResults(r.data.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  // Re-fetch on debounced input change
  useEffect(() => {
    if (debouncedQuery === initialQuery && results) return; // skip duplicate on mount
    if (debouncedQuery.length < 2) {
      setResults(null);
      if (debouncedQuery.length === 0) setSearchParams({}, { replace: true });
      return;
    }
    setSearchParams({ q: debouncedQuery }, { replace: true });
    setLoading(true);
    api
      .get("/search", { params: { q: debouncedQuery, limit: 20 } })
      .then((r) => setResults(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const users = results?.users ?? [];
  const parties = results?.parties ?? [];
  const totalUsers = users.length;
  const totalParties = parties.length;
  const totalAll = totalUsers + totalParties;

  const displayUsers = tab !== "parties" ? users : [];
  const displayParties = tab !== "users" ? parties : [];
  const noResults = !!results && totalAll === 0;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-text mb-6">Search</h1>

        {/* Search input */}
        <div className="relative mb-6">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            type="text"
            placeholder="Search users and parties..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-surface border border-text-muted/20 rounded-xl pl-12 pr-12 py-3 text-text
              placeholder-text-muted focus:outline-none focus:border-primary/50 transition text-base"
          />
          {loading && (
            <svg
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted animate-spin"
              fill="none" viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>

        {/* Tabs */}
        {results && totalAll > 0 && (
          <div className="flex gap-1 mb-6 bg-surface rounded-xl p-1 w-fit">
            {(["all", "users", "parties"] as Tab[]).map((t) => {
              const count = t === "all" ? totalAll : t === "users" ? totalUsers : totalParties;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    tab === t ? "bg-bg text-text shadow" : "text-text-muted hover:text-text"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold ${
                    tab === t ? "bg-primary text-white" : "bg-text-muted/20 text-text-muted"
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty prompt */}
        {!results && !loading && debouncedQuery.length < 2 && (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-text-muted/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-text-muted">Type at least 2 characters to search</p>
          </div>
        )}

        {/* No results */}
        {noResults && (
          <div className="text-center py-16">
            <p className="text-text-muted text-lg">No results for "{results!.query}"</p>
            <p className="text-text-muted text-sm mt-1">Try a different search term</p>
          </div>
        )}

        {/* Users section */}
        {displayUsers.length > 0 && (
          <div className="mb-8">
            {tab === "all" && (
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Users · {totalUsers}
              </h2>
            )}
            <div className="space-y-2">
              {displayUsers.map((u) => (
                <Link
                  key={u.id}
                  to={`/profile/${u.id}`}
                  className="flex items-center gap-4 bg-surface rounded-xl p-4 border border-text-muted/10 hover:border-primary/30 transition"
                >
                  <div className="w-12 h-12 rounded-full bg-accent shrink-0 flex items-center justify-center text-white text-lg font-bold overflow-hidden">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                      : u.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text font-semibold">{u.display_name}</p>
                    <p className="text-text-muted text-sm">@{u.username}</p>
                  </div>
                  {u.social_rating > 0 && (
                    <p className="text-text-muted text-sm shrink-0">★ {u.social_rating.toFixed(1)}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Parties section */}
        {displayParties.length > 0 && (
          <div>
            {tab === "all" && (
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Parties · {totalParties}
              </h2>
            )}
            <div className="space-y-2">
              {displayParties.map((p) => {
                const tags = parseTags(p.tags);
                return (
                  <Link
                    key={p.id}
                    to={`/parties/${p.id}`}
                    className="flex items-start gap-4 bg-surface rounded-xl p-4 border border-text-muted/10 hover:border-primary/30 transition"
                  >
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-accent/40 to-primary/30 shrink-0 overflow-hidden">
                      {p.cover_image_url && (
                        <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-text font-semibold truncate">{p.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold shrink-0 ${
                          p.status === "upcoming" ? "bg-success/20 text-success" :
                          p.status === "ongoing" ? "bg-primary/20 text-primary" :
                          p.status === "completed" ? "bg-accent/20 text-accent-hover" :
                          "bg-text-muted/20 text-text-muted"
                        }`}>{p.status}</span>
                      </div>
                      <p className="text-text-muted text-sm mt-0.5">
                        📍 {p.location_city} · 📅 {formatDate(p.date_time)} · {formatPrice(p.ticket_price)}
                      </p>
                      {p.host_display_name && (
                        <p className="text-text-muted text-xs mt-0.5">by {p.host_display_name}</p>
                      )}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="text-xs bg-accent/10 text-accent-hover px-2 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
