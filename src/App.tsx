import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/auth-context";
import { ThemeProvider } from "./context/theme-context";
import { useAuth } from "./context/auth-hook";
import Navbar from "./components/navbar";
import FeedPage from "./pages/feed";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import ProfilePage from "./pages/profile";
import DiscoverPage from "./pages/discover";
import PartyDetailPage from "./pages/party-detail";
import CreatePartyPage from "./pages/create-party";
import MyRequestsPage from "./pages/my-requests";
import DashboardPage from "./pages/dashboard";
import ManageRequestsPage from "./pages/manage-requests";
import RateAttendeesPage from "./pages/rate-attendees";
import PartyPhotosPage from "./pages/party-photos";
import UserPhotosPage from "./pages/user-photos";
import NotificationsPage from "./pages/notifications";
import PublicProfilePage from "./pages/public-profile";
import SearchPage from "./pages/search";
import BottomTabNav from "./components/bottom-tab-nav.tsx";

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

  return (
    <div className="premium-shell min-h-screen text-text">
      <Navbar />
      <main className="relative z-10 pb-24 md:pb-0">
        <Routes>
        {/* ── Guest-only (login / register) ── */}
        <Route element={<GuestOnlyRoute />}>
          <Route path="/auth/login"    element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
        </Route>

        {/* ── Protected (requires login) ── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/"                               element={<FeedPage />} />
          <Route path="/parties"                        element={<DiscoverPage />} />
          <Route path="/parties/create"                 element={<CreatePartyPage />} />
          <Route path="/parties/:partyId"               element={<PartyDetailPage />} />
          <Route path="/parties/:partyId/rate"          element={<RateAttendeesPage />} />
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
        </Route>

        {/* ── Catch-all: redirect to feed (or login if not auth'd) ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {user && <BottomTabNav />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
