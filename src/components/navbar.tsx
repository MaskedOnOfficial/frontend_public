import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef, type KeyboardEvent } from "react";
import { useAuth } from "../context/auth-hook";
import { useNotifications } from "../context/use-notifications-hook";
import api from "../lib/api";
import type { Party } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { Search, Bell, LogOut, Compass, Plus, LayoutDashboard, Inbox, Loader2, Sparkles } from "lucide-react";

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

  // #13 — Clear search state on route navigation
  const location = useLocation();
  useEffect(() => {
    setShowDropdown(false);
    setSearchQuery("");
    setResults(null);
    setSearching(false);
  }, [location.pathname]);

  // Live search
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSearching(false); // #14 — Reset searching for short queries
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
    <nav className="sticky z-50 border-b border-primary/[0.08] bg-bg/70 backdrop-blur-2xl" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div className="max-w-6xl mx-auto px-3 md:px-5 h-16 md:h-[4.5rem] flex items-center gap-3 md:gap-5">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary via-accent to-hot flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg md:text-xl font-extrabold tracking-tight">
            <span className="text-text">mask</span>
            <span className="brand-gradient-text">On</span>
          </span>
        </Link>

        {/* Search bar — visible only when logged in */}
        {user && (
          <div ref={searchRef} className="hidden md:block flex-1 max-w-md relative">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              {searching && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
              )}
              <input
                type="text"
                placeholder="Search people, parties..."
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
                aria-label="Search people, parties"
                className="input-luxe w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
              />
            </div>

            {/* Dropdown */}
            {showDropdown && (
              <div className="glass-panel absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl z-50 overflow-hidden border border-primary/10">
                {!hasResults ? (
                  <p className="text-text-muted text-sm px-5 py-4">No results for "{debouncedQuery}"</p>
                ) : (
                  <>
                    {/* Users */}
                    {results!.users.length > 0 && (
                      <div className="pt-2">
                        <p className="text-text-dim text-[10px] font-bold uppercase tracking-[0.15em] px-5 pb-2">People</p>
                        {results!.users.map((u) => (
                          <Link key={u.id} to={`/profile/${u.id}`} onClick={closeDropdown}
                            className="flex items-center gap-3 px-5 py-2.5 hover:bg-primary/[0.06] transition">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent shrink-0 flex items-center justify-center text-white text-sm font-bold overflow-hidden ring-2 ring-primary/20">
                              {u.avatar_url
                                ? <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                                : (u.display_name ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-text text-sm font-semibold truncate">{u.display_name}</p>
                              <p className="text-text-muted text-xs">@{u.username}</p>
                            </div>
                            {u.social_rating > 0 && (
                              <span className="ml-auto text-xs font-semibold text-warning shrink-0">★ {u.social_rating.toFixed(1)}</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Parties */}
                    {results!.parties.length > 0 && (
                      <div className="pt-2 border-t border-primary/[0.06]">
                        <p className="text-text-dim text-[10px] font-bold uppercase tracking-[0.15em] px-5 pb-2">Events</p>
                        {results!.parties.map((p) => (
                          <Link key={p.id} to={`/parties/${p.id}`} onClick={closeDropdown}
                            className="flex items-center justify-between px-5 py-2.5 hover:bg-primary/[0.06] transition gap-3">
                            <div className="min-w-0">
                              <p className="text-text text-sm font-semibold truncate">{p.title}</p>
                              <p className="text-text-muted text-xs">
                                {p.location_city}
                                {p.date_time ? ` · ${new Date(p.date_time).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}` : ""}
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
                              p.status === "upcoming" ? "status-upcoming" :
                              p.status === "ongoing" ? "status-ongoing" :
                              p.status === "completed" ? "status-completed" :
                              "status-cancelled"
                            }`}>{p.status}</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* See all */}
                    <Link
                      to={`/search?q=${encodeURIComponent(searchQuery)}`}
                      onClick={closeDropdown}
                      className="flex items-center justify-center gap-2 text-primary text-sm font-semibold py-3 border-t border-primary/[0.08] hover:bg-primary/[0.06] transition"
                    >
                      <Search className="w-3.5 h-3.5" />
                      See all results
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Nav links */}
        <div className="flex items-center gap-1.5 md:gap-2 ml-auto">
          {user ? (
            <>
              {/* Desktop nav links */}
              <Link to="/" aria-label="Feed" className="hidden xl:flex items-center gap-1.5 text-text-muted hover:text-primary transition text-sm font-medium px-3 py-2 rounded-lg hover:bg-primary/[0.06]">
                Feed
              </Link>
              <Link to="/parties" aria-label="Discover events" className="hidden md:flex items-center gap-1.5 text-text-muted hover:text-accent transition text-sm font-medium px-3 py-2 rounded-lg hover:bg-accent/[0.06]">
                <Compass className="w-4 h-4" />
                <span className="hidden lg:inline">Discover</span>
              </Link>
              <Link to="/parties/create" aria-label="Host a party" className="hidden md:flex items-center gap-1.5 text-text-muted hover:text-hot transition text-sm font-medium px-3 py-2 rounded-lg hover:bg-hot/[0.06]">
                <Plus className="w-4 h-4" />
                <span className="hidden lg:inline">Host</span>
              </Link>
              <Link to="/my-requests" aria-label="My requests" className="hidden lg:flex items-center gap-1.5 text-text-muted hover:text-text transition text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/[0.04]">
                <Inbox className="w-4 h-4" />
                <span className="hidden xl:inline">Requests</span>
              </Link>
              <Link to="/dashboard" aria-label="Host dashboard" className="hidden lg:flex items-center gap-1.5 text-text-muted hover:text-text transition text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/[0.04]">
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden xl:inline">Dashboard</span>
              </Link>

              {/* Mobile search icon */}
              <Link to="/search" className="text-text-muted hover:text-primary transition md:hidden p-2 rounded-lg hover:bg-primary/[0.06]" aria-label="Search">
                <Search className="w-5 h-5" />
              </Link>

              {/* Notifications */}
              <Link to="/notifications" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`} className="relative text-text-muted hover:text-primary transition p-2 rounded-lg hover:bg-primary/[0.06]">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-hot to-primary text-white text-[9px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg shadow-hot/30" style={{ animation: 'badge-pop 0.3s ease-out' }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile avatar */}
              <Link to="/profile/me" aria-label="My profile" className="ml-1">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary via-accent to-hot p-[2px] hover:shadow-lg hover:shadow-primary/25 transition-shadow">
                  <div className="w-full h-full rounded-full bg-bg flex items-center justify-center text-sm text-text font-bold overflow-hidden">
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                      : (user.display_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                </div>
              </Link>

              {/* Logout */}
              <button
                onClick={async () => {
                  await logout();
                  navigate("/auth/login", { replace: true });
                }}
                className="hidden md:flex items-center text-text-dim hover:text-error transition p-2 rounded-lg hover:bg-error/[0.06]"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/auth/login" className="text-text-muted hover:text-text transition text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/[0.04]">Sign In</Link>
              <Link
                to="/auth/register"
                className="btn-primary-luxe text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}
