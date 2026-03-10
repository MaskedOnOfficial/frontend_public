import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/auth-context";
import api from "../lib/api";

export default function Navbar() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let interval: ReturnType<typeof setInterval>;
    const fetch = () =>
      api
        .get("/notifications/unread-count")
        .then((r) => setUnread(r.data.data.count))
        .catch(() => {});
    fetch();
    interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <nav className="bg-surface border-b border-text-muted/10 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-text">
          🎭 mask<span className="text-primary">On</span>
        </Link>

        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link to="/parties" className="text-text-muted hover:text-text transition text-sm">
                Discover
              </Link>
              <Link to="/parties/create" className="text-text-muted hover:text-text transition text-sm">
                Host
              </Link>
              <Link to="/my-requests" className="text-text-muted hover:text-text transition text-sm">
                My Requests
              </Link>
              <Link to="/dashboard" className="text-text-muted hover:text-text transition text-sm">
                Dashboard
              </Link>
              <Link to="/notifications" className="relative text-text-muted hover:text-text transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.573 1.23H3.705a.75.75 0 01-.573-1.23A8.973 8.973 0 005.25 9.75V9zm4.502 8.9a2.251 2.251 0 004.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <Link to="/profile/me" className="text-text-muted hover:text-text transition text-sm">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm text-white font-bold overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                  ) : (
                    user.display_name.charAt(0).toUpperCase()
                  )}
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="text-text-muted hover:text-text transition text-sm"
              >
                Sign In
              </Link>
              <Link
                to="/auth/register"
                className="bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
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
