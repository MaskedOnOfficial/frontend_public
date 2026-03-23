import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import type { User, Photo, Rating, FriendUser } from "../types";
import { getApiErrorMessage } from "../lib/errors";

type FriendStatus = "none" | "pending" | "accepted";
type FriendDir = "incoming" | "outgoing" | null;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: me } = useAuth();
  const isOwnProfile = !!(me && me.id === userId);

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"photos" | "ratings" | "friends">("photos");

  // Photos
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosTotal, setPhotosTotal] = useState(0);
  const [photosPage, setPhotosPage] = useState(1);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  // Ratings
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  // Friends
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [friendDir, setFriendDir] = useState<FriendDir>(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [mutualFriends, setMutualFriends] = useState<FriendUser[]>([]);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [friendsTotal, setFriendsTotal] = useState(0);
  const [friendsPage, setFriendsPage] = useState(1);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [showUnfriendMenu, setShowUnfriendMenu] = useState(false);
  const unfriendRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (unfriendRef.current && !unfriendRef.current.contains(e.target as Node)) {
        setShowUnfriendMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get(`/users/${userId}`);
      setProfile(res.data.data.user);
    } catch (error) {
      console.error("Failed to load public profile:", getApiErrorMessage(error, "Unknown public profile error"));
    } finally {
      setLoading(false);
    }

    // Load friend count
    try {
      const countRes = await api.get(`/friends/${userId}/list?limit=1`);
      setFriendCount(countRes.data.data.total);
    } catch (error) {
      console.error("Failed to load friend count:", getApiErrorMessage(error, "Unknown friend count error"));
    }

    // Load friendship status + mutual friends (logged in, not own profile)
    if (me && !isOwnProfile) {
      try {
        const [statusRes, mutualRes] = await Promise.all([
          api.get(`/friends/${userId}/status`),
          api.get(`/friends/${userId}/mutual`),
        ]);
        const { status, direction } = statusRes.data.data;
        setFriendStatus(status || "none");
        setFriendDir(direction || null);
        setMutualFriends(mutualRes.data.data.mutuals || []);
      } catch (error) {
        console.error("Failed to load friendship state:", getApiErrorMessage(error, "Unknown friendship state error"));
      }
    }
  }, [isOwnProfile, me, userId]);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await api.get(`/users/${userId}/photos?page=${photosPage}&limit=12`);
      setPhotos(res.data.data.photos);
      setPhotosTotal(res.data.data.total);
    } catch (error) {
      console.error("Failed to load public photos:", getApiErrorMessage(error, "Unknown public photos error"));
    }
  }, [photosPage, userId]);

  const loadRatings = useCallback(async () => {
    try {
      const res = await api.get(`/users/${userId}/ratings`);
      setRatings(res.data.data.ratings);
    } catch (error) {
      console.error("Failed to load public ratings:", getApiErrorMessage(error, "Unknown public ratings error"));
    } finally {
      setRatingsLoading(false);
    }
  }, [userId]);

  const loadFriendsList = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const res = await api.get(`/friends/${userId}/list?page=${friendsPage}&limit=20`);
      setFriends(res.data.data.friends);
      setFriendsTotal(res.data.data.total);
    } catch (error) {
      console.error("Failed to load public friends list:", getApiErrorMessage(error, "Unknown public friends list error"));
    } finally {
      setFriendsLoading(false);
    }
  }, [friendsPage, userId]);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      setPhotosPage(1);
      setFriendsPage(1);
      setTab("photos");
      loadProfile();
    }
  }, [loadProfile, userId]);

  useEffect(() => {
    if (userId) loadPhotos();
  }, [loadPhotos, userId]);

  useEffect(() => {
    if (userId && tab === "ratings") loadRatings();
    if (userId && tab === "friends") loadFriendsList();
  }, [loadFriendsList, loadRatings, tab, userId]);

  useEffect(() => {
    if (userId && tab === "friends") loadFriendsList();
  }, [friendsPage, loadFriendsList, tab, userId]);

  async function handleLike(photoId: string) {
    try {
      await api.post(`/photos/${photoId}/like`);
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, like_count: p.like_count + 1 } : p))
      );
    } catch (error) {
      console.error("Failed to like public photo:", getApiErrorMessage(error, "Unknown like public photo error"));
    }
  }

  async function handleAddFriend() {
    if (!userId || friendLoading) return;
    setFriendLoading(true);
    try {
      const res = await api.post(`/friends/${userId}`);
      const newStatus = res.data.data.friendship?.status === "accepted" ? "accepted" : "pending";
      setFriendStatus(newStatus);
      setFriendDir("outgoing");
      if (newStatus === "accepted") setFriendCount((c) => c + 1);
    } catch (error) {
      console.error("Failed to add friend:", getApiErrorMessage(error, "Unknown add friend error"));
    } finally {
      setFriendLoading(false);
    }
  }

  async function handleAcceptFriend() {
    if (!userId || friendLoading) return;
    setFriendLoading(true);
    try {
      await api.patch(`/friends/${userId}/accept`);
      setFriendStatus("accepted");
      setFriendDir(null);
      setFriendCount((c) => c + 1);
    } catch (error) {
      console.error("Failed to accept friend request:", getApiErrorMessage(error, "Unknown accept friend error"));
    } finally {
      setFriendLoading(false);
    }
  }

  async function handleDeclineFriend() {
    if (!userId || friendLoading) return;
    setFriendLoading(true);
    try {
      await api.patch(`/friends/${userId}/reject`);
      setFriendStatus("none");
      setFriendDir(null);
    } catch (error) {
      console.error("Failed to reject friend request:", getApiErrorMessage(error, "Unknown reject friend error"));
    } finally {
      setFriendLoading(false);
    }
  }

  async function handleUnfriend() {
    if (!userId || friendLoading) return;
    setFriendLoading(true);
    setShowUnfriendMenu(false);
    try {
      await api.delete(`/friends/${userId}`);
      setFriendStatus("none");
      setFriendDir(null);
      setFriendCount((c) => Math.max(0, c - 1));
    } catch (error) {
      console.error("Failed to unfriend user:", getApiErrorMessage(error, "Unknown unfriend error"));
    } finally {
      setFriendLoading(false);
    }
  }

  async function handleCancelRequest() {
    if (!userId || friendLoading) return;
    setFriendLoading(true);
    try {
      await api.delete(`/friends/${userId}`);
      setFriendStatus("none");
      setFriendDir(null);
    } catch (error) {
      console.error("Failed to cancel friend request:", getApiErrorMessage(error, "Unknown cancel friend request error"));
    } finally {
      setFriendLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted">
        Loading...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-error text-lg">User not found</p>
      </div>
    );
  }

  const ratingVal = Number(profile.social_rating);
  const photoPages = Math.ceil(photosTotal / 12);
  const friendPages = Math.ceil(friendsTotal / 20);

  function renderFriendButton() {
    if (isOwnProfile) {
      return (
        <Link
          to="/profile/me"
          className="btn-secondary-luxe text-sm font-semibold px-5 py-2.5 rounded-xl transition"
        >
          Edit Profile
        </Link>
      );
    }
    if (!me) return null;

    if (friendStatus === "accepted") {
      return (
        <div className="relative" ref={unfriendRef}>
          <button
            onClick={() => setShowUnfriendMenu((v) => !v)}
            disabled={friendLoading}
            className="bg-success/20 hover:bg-success/30 text-success border border-success/30 text-sm font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2 disabled:opacity-50"
          >
            ✓ Friends <span className="text-success/60 text-xs">▾</span>
          </button>
          {showUnfriendMenu && (
            <div className="absolute top-full left-0 mt-1 bg-surface border border-text-muted/20 rounded-xl shadow-xl overflow-hidden z-10 w-40">
              <button
                onClick={handleUnfriend}
                className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/10 transition"
              >
                Unfriend
              </button>
            </div>
          )}
        </div>
      );
    }

    if (friendStatus === "pending" && friendDir === "outgoing") {
      return (
        <button
          onClick={handleCancelRequest}
          disabled={friendLoading}
          className="bg-surface-light hover:bg-error/10 text-text-muted hover:text-error border border-text-muted/20 hover:border-error/30 text-sm font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-50"
        >
          {friendLoading ? "..." : "Pending · Cancel"}
        </button>
      );
    }

    if (friendStatus === "pending" && friendDir === "incoming") {
      return (
        <div className="flex gap-2">
          <button
            onClick={handleAcceptFriend}
            disabled={friendLoading}
            className="bg-success/20 hover:bg-success/30 text-success border border-success/30 text-sm font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            Accept
          </button>
          <button
            onClick={handleDeclineFriend}
            disabled={friendLoading}
            className="bg-error/10 hover:bg-error/20 text-error border border-error/20 text-sm font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={handleAddFriend}
        disabled={friendLoading}
          className="btn-primary-luxe text-sm font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-50"
      >
        {friendLoading ? "..." : "+ Add Friend"}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero banner */}
      <div className="h-48 bg-gradient-to-br from-accent via-primary/40 to-accent/60 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(83,52,131,0.4),transparent_60%)]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10 pb-12">
        {/* Profile header card */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
              {/* Avatar */}
              <div className="relative -mt-20 sm:-mt-24 flex-shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-surface overflow-hidden bg-accent shadow-lg">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl text-white font-bold">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Name, username, bio, mutual friends */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-text">{profile.display_name}</h1>
                <p className="text-text-muted text-sm">@{profile.username}</p>
                {profile.bio && (
                  <p className="text-text-muted/80 text-sm mt-2 max-w-md">{profile.bio}</p>
                )}
                {/* Mutual friends mini strip */}
                {!isOwnProfile && mutualFriends.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex -space-x-2">
                      {mutualFriends.slice(0, 3).map((f) => (
                        <div
                          key={f.id}
                          className="w-6 h-6 rounded-full border-2 border-surface bg-accent overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold"
                        >
                          {f.avatar_url ? (
                            <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
                          ) : (
                            f.display_name.charAt(0).toUpperCase()
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-text-muted/70 text-xs">
                      {mutualFriends.length} mutual {mutualFriends.length === 1 ? "friend" : "friends"}
                    </span>
                  </div>
                )}
              </div>

              {/* Rating + friend button */}
              <div className="flex flex-col items-center gap-3 flex-shrink-0">
                {profile.total_ratings >= 3 ? (
                  <div className="bg-warning/10 border border-warning/20 rounded-xl px-5 py-3 text-center">
                    <div className="text-2xl font-bold text-warning">{ratingVal.toFixed(1)}</div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider">
                      {profile.total_ratings} ratings
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-light rounded-xl px-5 py-3 text-center">
                    <div className="text-sm text-text-muted">No rating yet</div>
                  </div>
                )}
                {renderFriendButton()}
              </div>
            </div>

            {/* Stats strip */}
            <div className="flex items-center justify-center sm:justify-start gap-5 mt-6 pt-6 border-t border-text-muted/10 flex-wrap">
              <div className="text-center">
                <div className="text-xl font-bold text-text">{profile.parties_hosted}</div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Hosted</div>
              </div>
              <div className="w-px h-8 bg-text-muted/10 hidden sm:block" />
              <div className="text-center">
                <div className="text-xl font-bold text-text">{profile.parties_attended}</div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Attended</div>
              </div>
              <div className="w-px h-8 bg-text-muted/10 hidden sm:block" />
              <div className="text-center">
                <div className="text-xl font-bold text-text">{photosTotal}</div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Photos</div>
              </div>
              <div className="w-px h-8 bg-text-muted/10 hidden sm:block" />
              <div className="text-center">
                <div className="text-xl font-bold text-text">{profile.total_ratings}</div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Reviews</div>
              </div>
              <div className="w-px h-8 bg-text-muted/10 hidden sm:block" />
              <button
                onClick={() => setTab("friends")}
                className="text-center hover:opacity-80 transition"
              >
                <div className="text-xl font-bold text-text">{friendCount}</div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Friends</div>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-panel flex gap-1 mt-6 rounded-xl p-1">
          {(["photos", "ratings", "friends"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition ${
                tab === t ? "bg-primary text-bg shadow" : "text-text-muted hover:text-text"
              }`}
            >
              {t === "photos"
                ? `📷 Photos (${photosTotal})`
                : t === "ratings"
                ? `⭐ Ratings (${profile.total_ratings})`
                : `👥 Friends (${friendCount})`}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {/* ===== PHOTOS TAB ===== */}
          {tab === "photos" && (
            <div>
              {photos.length === 0 ? (
                <div className="text-center py-16 bg-surface rounded-xl border border-dashed border-text-muted/20">
                  <p className="text-text-muted text-lg">No photos yet</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group shadow-md"
                        onClick={() => setLightbox(photo)}
                      >
                        <img
                          src={photo.image_url}
                          alt={photo.caption || "Photo"}
                          className="w-full h-full object-cover transition group-hover:scale-110 duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end">
                          <div className="p-3 w-full flex items-center justify-between">
                            <span className="text-white text-xs">❤️ {photo.like_count}</span>
                            {photo.caption && (
                              <span className="text-white/80 text-xs truncate max-w-[60%]">
                                {photo.caption}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {photoPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                      <button
                        onClick={() => setPhotosPage((p) => Math.max(1, p - 1))}
                        disabled={photosPage === 1}
                        className="px-3 py-1.5 text-sm rounded-lg bg-surface text-text-muted disabled:opacity-40 border border-text-muted/10"
                      >
                        Prev
                      </button>
                      <span className="px-3 py-1.5 text-sm text-text-muted">
                        {photosPage} / {photoPages}
                      </span>
                      <button
                        onClick={() => setPhotosPage((p) => Math.min(photoPages, p + 1))}
                        disabled={photosPage === photoPages}
                        className="px-3 py-1.5 text-sm rounded-lg bg-surface text-text-muted disabled:opacity-40 border border-text-muted/10"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===== RATINGS TAB ===== */}
          {tab === "ratings" && (
            <div>
              {ratingsLoading ? (
                <p className="text-text-muted text-center py-12">Loading ratings...</p>
              ) : ratings.length === 0 ? (
                <div className="text-center py-16 bg-surface rounded-xl border border-dashed border-text-muted/20">
                  <p className="text-text-muted text-lg">No ratings yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ratings.map((r) => (
                    <div
                      key={r.id}
                      className="glass-panel rounded-xl p-5 flex items-start gap-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {(r.rater_display_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-text font-semibold text-sm">{r.rater_display_name}</span>
                          {r.rater_username && (
                            <span className="text-text-muted text-xs">@{r.rater_username}</span>
                          )}
                          <span className="text-text-muted/40 text-xs ml-auto">{timeAgo(r.created_at)}</span>
                        </div>
                        <div className="flex gap-0.5 mb-2">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span
                              key={i}
                              className={`text-sm ${i < r.score ? "text-warning" : "text-text-muted/20"}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        {r.comment && <p className="text-text-muted text-sm">{r.comment}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== FRIENDS TAB ===== */}
          {tab === "friends" && (
            <div>
              {/* Mutual friends section */}
              {!isOwnProfile && mutualFriends.length > 0 && (
                <div className="glass-panel rounded-xl p-5 mb-4">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    {mutualFriends.length} Mutual {mutualFriends.length === 1 ? "Friend" : "Friends"}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {mutualFriends.map((f) => (
                      <Link
                        key={f.id}
                        to={`/profile/${f.id}`}
                        className="flex items-center gap-2 bg-surface-light rounded-lg px-3 py-2 hover:bg-primary/10 transition"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                          {f.avatar_url ? (
                            <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
                          ) : (
                            f.display_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-text text-xs font-semibold leading-tight">{f.display_name}</p>
                          <p className="text-text-muted text-[10px]">@{f.username}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Full friends list */}
              {friendsLoading ? (
                <p className="text-text-muted text-center py-12">Loading...</p>
              ) : friends.length === 0 ? (
                <div className="text-center py-16 bg-surface rounded-xl border border-dashed border-text-muted/20">
                  <p className="text-text-muted text-lg">No friends yet</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {friends.map((f) => (
                      <Link
                        key={f.id}
                        to={`/profile/${f.id}`}
                        className="glass-panel flex items-center gap-3 rounded-xl p-4 hover:border-primary/30 transition"
                      >
                        <div className="w-12 h-12 rounded-full bg-accent overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-lg font-bold">
                          {f.avatar_url ? (
                            <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
                          ) : (
                            f.display_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text font-semibold text-sm truncate">{f.display_name}</p>
                          <p className="text-text-muted text-xs">@{f.username}</p>
                        </div>
                        <div className="text-warning text-xs font-semibold flex-shrink-0">
                          ⭐ {Number(f.social_rating).toFixed(1)}
                        </div>
                      </Link>
                    ))}
                  </div>
                  {friendPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                      <button
                        onClick={() => setFriendsPage((p) => Math.max(1, p - 1))}
                        disabled={friendsPage === 1}
                        className="px-3 py-1.5 text-sm rounded-lg bg-surface text-text-muted disabled:opacity-40 border border-text-muted/10"
                      >
                        Prev
                      </button>
                      <span className="px-3 py-1.5 text-sm text-text-muted">
                        {friendsPage} / {friendPages}
                      </span>
                      <button
                        onClick={() => setFriendsPage((p) => Math.min(friendPages, p + 1))}
                        disabled={friendsPage === friendPages}
                        className="px-3 py-1.5 text-sm rounded-lg bg-surface text-text-muted disabled:opacity-40 border border-text-muted/10"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-w-3xl w-full glass-panel rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.image_url}
              alt={lightbox.caption || "Photo"}
              className="w-full max-h-[70vh] object-contain bg-black"
            />
            <div className="p-5 flex items-center justify-between">
              <div>
                {lightbox.caption && <p className="text-text text-sm">{lightbox.caption}</p>}
              </div>
              <button
                onClick={() => handleLike(lightbox.id)}
                className="text-primary hover:text-primary-hover transition text-sm font-semibold"
              >
                ❤️ {lightbox.like_count}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
