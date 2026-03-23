import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, type KeyboardEvent } from "react";
import { useAuth } from "../context/auth-hook";
import { useNotifications } from "../context/use-notifications-hook";
import api from "../lib/api";
import type { Party } from "../types";
import { getApiErrorMessage } from "../lib/errors";

type SearchUser = { id: string; username: string; display_name: string; avatar_url: string | null; social_rating: number };
type SearchResults = { users: SearchUser[]; parties: Party[] };

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Live search
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      return;
    }
    api
      .get("/search", { params: { q: debouncedQuery, limit: 5 } })
      .then((r) => { setResults(r.data.data); setShowDropdown(true); })
      .catch((error) => {
        console.error("Navbar search failed:", getApiErrorMessage(error, "Unknown search error"));
      })
      .finally(() => setSearching(false));
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowDropdown(false);
      setSearchQuery("");
    }
    if (e.key === "Escape") setShowDropdown(false);
  }

  function closeDropdown() {
    setShowDropdown(false);
    setSearchQuery("");
  }

  const hasResults = results && (results.users.length > 0 || results.parties.length > 0);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-surface/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-3 md:px-4 h-16 md:h-[4.25rem] flex items-center gap-3 md:gap-4">

        {/* Logo */}
        <Link to="/" className="text-lg md:text-xl font-extrabold text-text shrink-0 tracking-tight">
          <span className="mr-1">🎭</span>
          mask<span className="brand-gradient-text">On</span>
        </Link>

        {/* Search bar — visible only when logged in */}
        {user && (
          <div ref={searchRef} className="hidden md:block flex-1 max-w-md relative">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searching && (
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin"
                  fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <input
                type="text"
                placeholder="Search users & parties..."
                value={searchQuery}
                onChange={(e) => {
                  const next = e.target.value;
                  setSearchQuery(next);
                  if (next.length < 2) {
                    setSearching(false);
                    setResults(null);
                    setShowDropdown(false);
                  } else {
                    setSearching(true);
                  }
                }}
                onFocus={() => { if (results && searchQuery.length >= 2) setShowDropdown(true); }}
                onKeyDown={onSearchKeyDown}
                className="input-luxe w-full rounded-xl pl-9 pr-4 py-2 text-sm"
              />
            </div>

            {/* Dropdown */}
            {showDropdown && (
              <div className="glass-panel absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl z-50 overflow-hidden">
                {!hasResults ? (
                  <p className="text-text-muted text-sm px-4 py-3">No results for "{debouncedQuery}"</p>
                ) : (
                  <>
                    {/* Users */}
                    {results!.users.length > 0 && (
                      <div>
                        <p className="text-text-muted text-xs font-semibold uppercase tracking-wider px-4 pt-3 pb-1">People</p>
                        {results!.users.map((u) => (
                          <Link key={u.id} to={`/profile/${u.id}`} onClick={closeDropdown}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/6 transition">
                            <div className="w-8 h-8 rounded-full bg-accent shrink-0 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                              {u.avatar_url
                                ? <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                                : u.display_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-text text-sm font-medium truncate">{u.display_name}</p>
                              <p className="text-text-muted text-xs">@{u.username}</p>
                            </div>
                            {u.social_rating > 0 && (
                              <span className="ml-auto text-xs text-text-muted shrink-0">★ {u.social_rating.toFixed(1)}</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Parties */}
                    {results!.parties.length > 0 && (
                      <div>
                        <p className="text-text-muted text-xs font-semibold uppercase tracking-wider px-4 pt-3 pb-1">Parties</p>
                        {results!.parties.map((p) => (
                          <Link key={p.id} to={`/parties/${p.id}`} onClick={closeDropdown}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-white/6 transition gap-3">
                            <div className="min-w-0">
                              <p className="text-text text-sm font-medium truncate">{p.title}</p>
                              <p className="text-text-muted text-xs">
                                {p.location_city}
                                {p.date_time ? ` · ${new Date(p.date_time).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}` : ""}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold shrink-0 ${
                              p.status === "upcoming" ? "bg-success/20 text-success" :
                              p.status === "ongoing" ? "bg-primary/20 text-primary" :
                              p.status === "completed" ? "bg-accent/20 text-accent-hover" :
                              "bg-text-muted/20 text-text-muted"
                            }`}>{p.status}</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* See all */}
                    <Link
                      to={`/search?q=${encodeURIComponent(searchQuery)}`}
                      onClick={closeDropdown}
                      className="block text-center text-primary text-sm py-2.5 border-t border-white/10 hover:bg-white/6 transition"
                    >
                      See all results →
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Nav links */}
        <div className="flex items-center gap-3 md:gap-5 ml-auto">
          {user ? (
            <>
              <Link to="/" className="text-text-muted hover:text-text transition text-sm hidden xl:block">Feed</Link>
              <Link to="/parties" className="text-text-muted hover:text-text transition text-sm hidden md:block">Discover</Link>
              <Link to="/parties/create" className="text-text-muted hover:text-text transition text-sm hidden md:block">Host</Link>
              <Link to="/my-requests" className="text-text-muted hover:text-text transition text-sm hidden lg:block">Requests</Link>
              <Link to="/dashboard" className="text-text-muted hover:text-text transition text-sm hidden lg:block">Dashboard</Link>
              <Link to="/search" className="text-text-muted hover:text-text transition md:hidden" aria-label="Search">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                </svg>
              </Link>
              <Link to="/notifications" className="relative text-text-muted hover:text-text transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.573 1.23H3.705a.75.75 0 01-.573-1.23A8.973 8.973 0 005.25 9.75V9zm4.502 8.9a2.251 2.251 0 004.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-bg text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link to="/profile/me" className="text-text-muted hover:text-text transition text-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-sm text-white font-bold overflow-hidden ring-2 ring-white/10">
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                    : user.display_name.charAt(0).toUpperCase()}
                </div>
              </Link>
              {/* Logout */}
              <button
                onClick={async () => {
                  await logout();
                  navigate("/auth/login", { replace: true });
                }}
                className="text-text-muted hover:text-error transition text-sm font-semibold hidden md:inline"
                title="Sign Out"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth/login" className="text-text-muted hover:text-text transition text-sm">Sign In</Link>
              <Link
                to="/auth/register"
                className="btn-primary-luxe text-sm px-4 py-2 rounded-lg transition"
              >
                Register
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}
