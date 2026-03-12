import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/auth-context";
import Navbar from "./components/navbar";
import HomePage from "./pages/home";
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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/profile/me" element={<ProfilePage />} />
          <Route path="/parties" element={<DiscoverPage />} />
          <Route path="/parties/create" element={<CreatePartyPage />} />
          <Route path="/parties/:partyId" element={<PartyDetailPage />} />
          <Route path="/parties/:partyId/rate" element={<RateAttendeesPage />} />
          <Route path="/parties/:partyId/photos" element={<PartyPhotosPage />} />
          <Route path="/my-requests" element={<MyRequestsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/:partyId/requests" element={<ManageRequestsPage />} />
          <Route path="/profile/me/photos" element={<UserPhotosPage />} />
          <Route path="/profile/:userId" element={<PublicProfilePage />} />
          <Route path="/profile/:userId/photos" element={<UserPhotosPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
