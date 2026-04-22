import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { useState, useEffect, useCallback, Component, type ReactNode } from "react";
import { AuthProvider } from "./context/auth-context";
import { ThemeProvider } from "./context/theme-context";
import { useAuth } from "./context/auth-hook";
import { initCapacitor } from "./lib/capacitor";
import { initPushNotifications } from "./lib/push-notifications";
import api from "./lib/api";
import Navbar from "./components/navbar";
import CrowdRatingGate from "./components/crowd-rating-gate";
import FeedPage from "./pages/feed";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import ProfilePage from "./pages/profile";
import SettingsPage from "./pages/settings";
import DiscoverPage from "./pages/discover";
import PartyDetailPage from "./pages/party-detail";
import CreatePartyPage from "./pages/create-party";
import EditPartyPage from "./pages/edit-party";
import MyRequestsPage from "./pages/my-requests";
import DashboardPage from "./pages/dashboard";
import ManageRequestsPage from "./pages/manage-requests";
import RateCrowdPage from "./pages/rate-crowd";
import PartyPhotosPage from "./pages/party-photos";
import UserPhotosPage from "./pages/user-photos";
import NotificationsPage from "./pages/notifications";
import PublicProfilePage from "./pages/public-profile";
import SearchPage from "./pages/search";
import CreatePostPage from "./pages/create-post";
import VerifyEmailPage from "./pages/verify-email";
import BottomTabNav from "./components/bottom-tab-nav.tsx";

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-text mb-2">Something went wrong</h1>
            <p className="text-text-muted text-sm mb-6">{this.state.error?.message || "An unexpected error occurred."}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = "/"; }}
              className="btn-primary-luxe font-bold px-6 py-3 rounded-xl"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── 404 Page ─────────────────────────────────────────────────────────────────

function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black brand-gradient-text mb-4 leading-none">404</div>
        <h1 className="text-xl font-bold text-text mb-2">Page not found</h1>
        <p className="text-text-muted text-sm mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn-primary-luxe font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2">
          Go Home
        </Link>
      </div>
    </div>
  );
}

// ─── Scroll Restoration (#21) ─────────────────────────────────────────────────

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

// ─── Auth Guards ──────────────────────────────────────────────────────────────

/**
 * ProtectedRoute: Requires the user to be logged in.
 * Shows a full-screen spinner while the auth state is being resolved.
 * Redirects to /auth/login if not authenticated.
 */
function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading maskOn…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return <Outlet />;
}

/**
 * GuestOnlyRoute: Only accessible when NOT logged in.
 * Redirects already-authenticated users to the feed (/).
 */
function GuestOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// ─── App Shell ────────────────────────────────────────────────────────────────

function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Pending crowd ratings state
  const [pendingRatings, setPendingRatings] = useState<any[]>([]);
  const [pendingChecked, setPendingChecked] = useState(false);

  // Initialize Capacitor native plugins on first mount
  useEffect(() => {
    initCapacitor(navigate);
  }, [navigate]);

  // Register push notification token whenever the user logs in
  useEffect(() => {
    if (user) {
      initPushNotifications();
    }
  }, [user]);

  // Check for pending crowd ratings whenever user changes
  const checkPendingRatings = useCallback(async () => {
    if (!user) { setPendingRatings([]); setPendingChecked(true); return; }
    try {
      const res = await api.get("/users/me/pending-ratings");
      setPendingRatings(res.data.data.pending || []);
    } catch {
      setPendingRatings([]);
    }
    setPendingChecked(true);
  }, [user]);

  useEffect(() => { checkPendingRatings(); }, [checkPendingRatings]);

  // #22 — Hide navbar on auth pages
  const isAuthPage = location.pathname.startsWith("/auth");

  // Show rating gate if user has pending crowd ratings
  const showRatingGate = user && pendingChecked && pendingRatings.length > 0;

  return (
    <div className="premium-shell min-h-screen text-text">
      <ScrollToTop />
      {!isAuthPage && !showRatingGate && <Navbar />}
      {showRatingGate && (
        <CrowdRatingGate
          pendingParties={pendingRatings}
          onAllRated={() => { setPendingRatings([]); }}
        />
      )}
      <main className={`relative z-10 ${!isAuthPage && user ? "pb-24 md:pb-0" : ""}`} style={showRatingGate ? { display: "none" } : undefined}>
        <Routes>
        {/* ── Guest-only (login / register) ── */}
        <Route element={<GuestOnlyRoute />}>
          <Route path="/auth/login"    element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
        </Route>

        {/* ── Public routes (no auth required) ── */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* ── Protected (requires login) ── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/"                               element={<FeedPage />} />
          <Route path="/parties"                        element={<DiscoverPage />} />
          <Route path="/parties/create"                 element={<CreatePartyPage />} />
          <Route path="/parties/:partyId"               element={<PartyDetailPage />} />
          <Route path="/parties/:partyId/edit"            element={<EditPartyPage />} />
          <Route path="/parties/:partyId/rate"          element={<RateCrowdPage />} />
          <Route path="/parties/:partyId/photos"        element={<PartyPhotosPage />} />
          <Route path="/my-requests"                    element={<MyRequestsPage />} />
          <Route path="/dashboard"                      element={<DashboardPage />} />
          <Route path="/dashboard/:partyId/requests"   element={<ManageRequestsPage />} />
          <Route path="/profile/me"                     element={<ProfilePage />} />
          <Route path="/profile/me/photos"              element={<UserPhotosPage />} />
          <Route path="/profile/:userId"                element={<PublicProfilePage />} />
          <Route path="/profile/:userId/photos"         element={<UserPhotosPage />} />
          <Route path="/notifications"                  element={<NotificationsPage />} />
          <Route path="/search"                         element={<SearchPage />} />
          <Route path="/settings"                       element={<SettingsPage />} />
          <Route path="/create-post"                    element={<CreatePostPage />} />
        </Route>

        {/* ── Catch-all: 404 page ── */}
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {user && !isAuthPage && !showRatingGate && <BottomTabNav />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <AppShell />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
