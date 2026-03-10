import { useAuth } from "../context/auth-context";
import { Link } from "react-router-dom";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero section */}
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
        <h1 className="text-5xl font-bold text-text mb-4">
          🎭 mask<span className="text-primary">On</span>
        </h1>
        <p className="text-xl text-text-muted mb-8 max-w-2xl mx-auto">
          Host house parties. Join the vibe. Get rated.
        </p>

        {!user ? (
          <div className="flex gap-4 justify-center">
            <Link
              to="/auth/register"
              className="bg-primary hover:bg-primary-hover text-white font-semibold px-8 py-3 rounded-lg transition"
            >
              Get Started
            </Link>
            <Link
              to="/auth/login"
              className="bg-surface-light hover:bg-surface text-text font-semibold px-8 py-3 rounded-lg border border-text-muted/20 transition"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-text text-lg">
              Welcome back, <span className="text-primary font-semibold">{user.display_name}</span>!
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/parties"
                className="bg-primary hover:bg-primary-hover text-white font-semibold px-8 py-3 rounded-lg transition"
              >
                Discover Parties
              </Link>
              <Link
                to="/profile/me"
                className="bg-surface-light hover:bg-surface text-text font-semibold px-8 py-3 rounded-lg border border-text-muted/20 transition"
              >
                My Profile
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Feature cards */}
      <div className="max-w-5xl mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface rounded-xl p-6 border border-text-muted/10">
          <div className="text-3xl mb-3">🏠</div>
          <h3 className="text-text font-semibold text-lg mb-2">Host Parties</h3>
          <p className="text-text-muted text-sm">
            Create your own house party. Set the vibe, the price, and choose who gets in.
          </p>
        </div>
        <div className="bg-surface rounded-xl p-6 border border-text-muted/10">
          <div className="text-3xl mb-3">⭐</div>
          <h3 className="text-text font-semibold text-lg mb-2">Social Rating</h3>
          <p className="text-text-muted text-sm">
            Build your reputation. Get rated by fellow partygoers after every event.
          </p>
        </div>
        <div className="bg-surface rounded-xl p-6 border border-text-muted/10">
          <div className="text-3xl mb-3">📸</div>
          <h3 className="text-text font-semibold text-lg mb-2">Share Moments</h3>
          <p className="text-text-muted text-sm">
            Upload party pics, build your gallery, and show the world your social life.
          </p>
        </div>
      </div>
    </div>
  );
}
