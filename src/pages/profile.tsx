import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { useTheme } from "../context/use-theme";
import api from "../lib/api";
import type { Photo, Rating, FriendUser, PendingFriendRequest } from "../types";
import { getApiErrorMessage } from "../lib/errors";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"photos" | "ratings" | "friends" | "settings">("photos");
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosTotal, setPhotosTotal] = useState(0);
  const [photosPage, setPhotosPage] = useState(1);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [selectedHighlightPartyId, setSelectedHighlightPartyId] = useState<string | null>(null);
  const [partyTitles, setPartyTitles] = useState<Record<string, string>>({});

  // Ratings
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  // Friends
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name);
      setBio(user.bio || "");
    }
  }, [user]);

  const loadPhotos = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get(`/users/${user!.id}/photos?page=${photosPage}&limit=36`);
      const loadedPhotos: Photo[] = res.data.data.photos;
      setPhotos(loadedPhotos);
      setPhotosTotal(res.data.data.total);

      const uniquePartyIds = Array.from(new Set(
        loadedPhotos
          .map((p) => p.party_id)
          .filter((partyId): partyId is string => Boolean(partyId)),
      ));

      if (uniquePartyIds.length > 0) {
        const titleEntries = await Promise.all(
          uniquePartyIds.map(async (id) => {
            try {
              const partyRes = await api.get(`/parties/${id}`);
              const title = partyRes.data.data.party?.title as string | undefined;
              return [id, title || "Event"] as const;
            } catch {
              return [id, "Event"] as const;
            }
          }),
        );

        setPartyTitles((prev) => ({
          ...prev,
          ...Object.fromEntries(titleEntries),
        }));
      }
    } catch (error) {
      console.error("Failed to load profile photos:", getApiErrorMessage(error, "Unknown profile photos error"));
    } finally { setPhotosLoading(false); }
  }, [photosPage, user]);

  const loadRatings = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get(`/users/${user!.id}/ratings`);
      setRatings(res.data.data.ratings);
    } catch (error) {
      console.error("Failed to load profile ratings:", getApiErrorMessage(error, "Unknown profile ratings error"));
    } finally { setRatingsLoading(false); }
  }, [user]);

  const loadFriendsList = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const res = await api.get("/friends/me?limit=100");
      setFriends(res.data.data.friends);
      setFriendCount(res.data.data.total);
    } catch (error) {
      console.error("Failed to load friends list:", getApiErrorMessage(error, "Unknown friends list error"));
    } finally { setFriendsLoading(false); }
  }, []);

  const loadPendingRequests = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await api.get("/friends/me/pending");
      setPendingRequests(res.data.data.requests || []);
    } catch (error) {
      console.error("Failed to load pending friend requests:", getApiErrorMessage(error, "Unknown pending requests error"));
    } finally { setPendingLoading(false); }
  }, []);

  useEffect(() => {
    if (user) loadPhotos();
  }, [loadPhotos, user]);

  useEffect(() => {
    if (user && tab === "ratings") loadRatings();
    if (user && tab === "friends") { loadFriendsList(); loadPendingRequests(); }
  }, [loadFriendsList, loadPendingRequests, loadRatings, tab, user]);

  useEffect(() => {
    if (user && tab === "friends") loadFriendsList();
  }, [loadFriendsList, tab, user]);

  async function handleAcceptFriend(requesterId: string) {
    setPendingActionId(requesterId);
    try {
      await api.patch(`/friends/${requesterId}/accept`);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requesterId));
      setFriendCount((c) => c + 1);
      loadFriendsList();
    } catch (error) {
      console.error("Failed to accept friend request:", getApiErrorMessage(error, "Unknown accept friend error"));
    } finally { setPendingActionId(null); }
  }

  async function handleDeclineFriend(requesterId: string) {
    setPendingActionId(requesterId);
    try {
      await api.patch(`/friends/${requesterId}/reject`);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requesterId));
    } catch (error) {
      console.error("Failed to reject friend request:", getApiErrorMessage(error, "Unknown reject friend error"));
    } finally { setPendingActionId(null); }
  }

  async function handleUnfriend(friendId: string) {
    try {
      await api.delete(`/friends/${friendId}`);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
      setFriendCount((c) => Math.max(0, c - 1));
    } catch (error) {
      console.error("Failed to unfriend user:", getApiErrorMessage(error, "Unknown unfriend error"));
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      await api.put("/users/me/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await refreshUser();
    } catch (error) {
      console.error("Failed to upload avatar:", getApiErrorMessage(error, "Unknown avatar upload error"));
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      if (caption.trim()) fd.append("caption", caption.trim());
      await api.post("/photos", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCaption("");
      loadPhotos();
    } catch (error) {
      console.error("Failed to upload profile photo:", getApiErrorMessage(error, "Unknown profile photo upload error"));
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function handleDeletePhoto(photoId: string) {
    try {
      await api.delete(`/photos/${photoId}`);
      setPhotos((p) => p.filter((x) => x.id !== photoId));
      setPhotosTotal((t) => t - 1);
      setLightbox(null);
    } catch (error) {
      console.error("Failed to delete profile photo:", getApiErrorMessage(error, "Unknown delete profile photo error"));
    }
  }

  async function loadComments(photoId: string) {
    setLoadingComments(true);
    setCommentError("");
    try {
      const res = await api.get(`/photos/${photoId}/comments`);
      setComments(res.data.data.comments || []);
    } catch (error) {
      console.error("Failed to load comments:", getApiErrorMessage(error, "Unknown error"));
      setCommentError("Failed to load comments");
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleAddComment() {
    if (!lightbox || !newComment.trim()) return;

    setPostingComment(true);
    setCommentError("");
    try {
      const res = await api.post(`/photos/${lightbox.id}/comments`, {
        comment_text: newComment.trim(),
      });
      setComments([res.data.data.comment, ...comments]);
      setNewComment("");
    } catch (error) {
      setCommentError(getApiErrorMessage(error, "Failed to post comment"));
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await api.delete(`/photos/comments/${commentId}`);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (error) {
      setCommentError(getApiErrorMessage(error, "Failed to delete comment"));
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await api.put("/users/me", { display_name: displayName, bio });
      await refreshUser();
      setMessage("Profile updated!");
      setEditing(false);
    } catch (error: unknown) {
      setMessage(getApiErrorMessage(error, "Update failed"));
    } finally { setSaving(false); }
  }

  if (!user) return null;

  function ThemeControlSection() {
    return (
      <div className="mt-8 pt-6 border-t border-text-muted/10">
        <span className="text-xs text-text-muted uppercase tracking-wider font-semibold block mb-4">Theme</span>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => toggleTheme("dark")}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition border ${
              theme === "dark"
                ? "bg-primary text-bg border-primary"
                : "bg-text-muted/5 text-text border-text-muted/10 hover:bg-text-muted/10"
            }`}
          >
            🌙 Dark
          </button>
          <button
            onClick={() => toggleTheme("light")}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition border ${
              theme === "light"
                ? "bg-primary text-bg border-primary"
                : "bg-text-muted/5 text-text border-text-muted/10 hover:bg-text-muted/10"
            }`}
          >
            ☀️ Light
          </button>
        </div>
      </div>
    );
  }

  const ratingVal = Number(user.social_rating);
  const profilePhotos = photos.filter((photo) => !photo.party_id);
  const partyPhotos = photos.filter((photo) => photo.party_id);
  const highlightPartyIds = Array.from(new Set(
    partyPhotos
      .map((photo) => photo.party_id)
      .filter((partyId): partyId is string => Boolean(partyId)),
  ));
  const activeEventPhotos = selectedHighlightPartyId
    ? partyPhotos.filter((photo) => photo.party_id === selectedHighlightPartyId)
    : profilePhotos;
  const photoPages = Math.ceil(photosTotal / 36);

  return (
    <div className="min-h-screen bg-bg pb-20 md:pb-12">
      {/* Top header bar - Instagram style */}
      <div className="fixed top-0 left-0 right-0 z-40 glass-panel border-b border-text-muted/10 px-4 py-3 h-16 flex items-center justify-between">
        <button className="text-xl text-text-muted hover:text-text transition">←</button>
        <h1 className="text-base font-bold text-text">{user.display_name}</h1>
        <button className="text-xl text-text-muted hover:text-text transition">⋮</button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-20">
        {/* Profile header section */}
        <div className="flex flex-col items-center text-center py-8">
          {/* Avatar with upload */}
          <div className="relative group mb-6 flex-shrink-0">
            <div className="w-28 h-28 rounded-full border-4 border-primary/40 overflow-hidden bg-accent shadow-xl">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl text-white font-bold">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
            >
              <span className="text-white text-xs font-semibold">
                {avatarUploading ? "..." : "Edit"}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              aria-label="Upload avatar image"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            {/* Online dot */}
            <div className="absolute bottom-1 right-1 w-4 h-4 bg-success rounded-full border-[2px] border-bg" />
          </div>

          {/* Name & username */}
          <h2 className="text-2xl font-bold text-text mb-0.5">{user.display_name}</h2>
          <p className="text-text-muted text-sm">@{user.username}</p>
        </div>

        {/* Stats row - Instagram style (3 columns) */}
        <div className="grid grid-cols-3 gap-6 py-6 border-y border-text-muted/10 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-text">{photosTotal}</div>
            <div className="text-xs text-text-muted uppercase tracking-wider mt-1">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text">{friendCount}</div>
            <div className="text-xs text-text-muted uppercase tracking-wider mt-1">Friends</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">{ratingVal.toFixed(1)}</div>
            <div className="text-xs text-text-muted uppercase tracking-wider mt-1">Rating</div>
          </div>
        </div>

        {/* Bio section */}
        {user.bio && (
          <div className="text-center mb-6">
            <p className="text-text-muted text-sm">{user.bio}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setTab("friends")}
            className="flex-1 bg-bg border border-text-muted/20 text-text font-semibold py-2.5 rounded-lg hover:bg-text-muted/5 transition"
          >
            Friends
          </button>
          <button
            onClick={() => setTab("settings")}
            className="flex-1 bg-bg border border-text-muted/20 text-text font-semibold py-2.5 rounded-lg hover:bg-text-muted/5 transition"
          >
            About
          </button>
        </div>

        {/* Tabs - horizontal icons like Instagram */}
        <div className="flex gap-8 border-t border-text-muted/10 my-6 justify-center">
          {(["photos", "ratings", "friends", "settings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-4 text-xl transition ${
                tab === t
                  ? "text-text border-b-2 border-primary"
                  : "text-text-muted hover:text-text border-b-2 border-transparent"
              }`}
              title={t === "photos" ? "Photos" : t === "ratings" ? "Likes" : t === "friends" ? "Friends" : "Settings"}
            >
              {t === "photos" ? "📷" : t === "ratings" ? "❤️" : t === "friends" ? "👥" : "⚙️"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {/* ===== PHOTOS TAB ===== */}
          {tab === "photos" && (
            <div>
              {highlightPartyIds.length > 0 && (
                <div className="mb-8">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold mb-4">Highlights</p>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {highlightPartyIds.map((partyId) => {
                      const eventPhotos = partyPhotos.filter((photo) => photo.party_id === partyId);
                      const cover = eventPhotos[0];
                      const isActive = selectedHighlightPartyId === partyId;

                      return (
                        <button
                          key={partyId}
                          onClick={() => setSelectedHighlightPartyId((prev) => (prev === partyId ? null : partyId))}
                          className="flex-shrink-0 flex flex-col items-center gap-2 group"
                          title={partyTitles[partyId] || "Event"}
                        >
                          <div className={`p-[3px] rounded-full transition ${isActive ? "bg-gradient-to-br from-primary via-warning to-accent" : "bg-text-muted/20 group-hover:bg-primary/40"}`}>
                            <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-bg bg-surface">
                              {cover ? (
                                <img
                                  src={cover.image_url}
                                  alt={partyTitles[partyId] || "Event"}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">E</div>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-text-muted max-w-[80px] truncate text-center">
                            {partyTitles[partyId] || "Event"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload bar */}
              <div className="bg-surface rounded-lg border border-text-muted/10 p-3 mb-8 flex items-center gap-2">
                <input
                  type="text"
                  aria-label="Photo caption"
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="input-luxe flex-1 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  ref={photoInputRef}
                  type="file"
                  aria-label="Upload profile photo"
                  title="Upload profile photo"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-primary-luxe text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 flex-shrink-0"
                >
                  {uploading ? "..." : "Add"}
                </button>
              </div>

              {photosLoading ? (
                <p className="text-text-muted text-center py-12">Loading...</p>
              ) : activeEventPhotos.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  <p className="text-sm">
                    {selectedHighlightPartyId ? "No photos in this highlight" : "No posts yet"}
                  </p>
                </div>
              ) : (
                <>
                  {selectedHighlightPartyId && (
                    <button
                      onClick={() => setSelectedHighlightPartyId(null)}
                      className="text-xs px-3 py-1.5 rounded-lg btn-secondary-luxe mb-4 font-medium"
                    >
                      View All
                    </button>
                  )}
                  <div className="grid grid-cols-3 gap-1">
                    {activeEventPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="aspect-square bg-surface rounded-sm overflow-hidden cursor-pointer group relative"
                        onClick={() => {
                          setLightbox(photo);
                          setComments([]);
                          setNewComment("");
                          setCommentError("");
                          loadComments(photo.id);
                        }}
                      >
                        <img
                          src={photo.image_url}
                          alt={photo.caption || "Photo"}
                          className="w-full h-full object-cover transition group-hover:scale-105 duration-200"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="text-white text-2xl flex gap-4">
                            <div className="flex flex-col items-center">
                              <span>💬</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span>❤️</span>
                              <span className="text-xs mt-0.5">{photo.like_count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {photoPages > 1 && !selectedHighlightPartyId && (
                    <div className="flex justify-center gap-2 mt-8">
                      <button
                        onClick={() => setPhotosPage((p) => Math.max(1, p - 1))}
                        disabled={photosPage === 1}
                        className="btn-secondary-luxe px-3 py-1.5 text-sm rounded-lg disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="px-3 py-1.5 text-sm text-text-muted">{photosPage} / {photoPages}</span>
                      <button
                        onClick={() => setPhotosPage((p) => Math.min(photoPages, p + 1))}
                        disabled={photosPage === photoPages}
                        className="btn-secondary-luxe px-3 py-1.5 text-sm rounded-lg disabled:opacity-40"
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
                <p className="text-text-muted text-center py-12">Loading...</p>
              ) : ratings.length === 0 ? (
                <div className="text-center py-12 text-text-muted text-sm">
                  No ratings yet
                </div>
              ) : (
                <div className="space-y-2">
                  {ratings.map((r) => (
                    <div key={r.id} className="border-b border-text-muted/10 pb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {(r.rater_display_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-text font-semibold text-sm">{r.rater_display_name}</span>
                            <span className="text-text-muted/40 text-xs">{timeAgo(r.created_at)}</span>
                          </div>
                          <div className="flex gap-0.5 mb-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <span key={i} className={`text-xs ${i < r.score ? "text-warning" : "text-text-muted/20"}`}>★</span>
                            ))}
                          </div>
                          {r.comment && <p className="text-text-muted text-xs">{r.comment}</p>}
                        </div>
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
              {/* Pending incoming requests */}
              {(pendingLoading || pendingRequests.length > 0) && (
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    {pendingLoading
                      ? "Loading..."
                      : `Pending (${pendingRequests.length})`}
                  </h3>
                  {!pendingLoading && (
                    <div className="space-y-2">
                      {pendingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center gap-3 py-2 border-b border-text-muted/10"
                        >
                          <Link to={`/profile/${req.id}`} className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-accent overflow-hidden flex items-center justify-center text-white text-sm font-bold">
                              {req.avatar_url ? (
                                <img src={req.avatar_url} alt={req.display_name} className="w-full h-full object-cover" />
                              ) : (
                                req.display_name.charAt(0).toUpperCase()
                              )}
                            </div>
                          </Link>
                          <Link to={`/profile/${req.id}`} className="flex-1 min-w-0 hover:opacity-80 transition">
                            <p className="text-text font-semibold text-sm truncate">{req.display_name}</p>
                            <p className="text-text-muted text-xs">@{req.username}</p>
                          </Link>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleAcceptFriend(req.id)}
                              disabled={pendingActionId === req.id}
                              className="bg-primary text-text font-semibold text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                            >
                              Follow
                            </button>
                            <button
                              onClick={() => handleDeclineFriend(req.id)}
                              disabled={pendingActionId === req.id}
                              className="bg-text-muted/10 text-text-muted font-semibold text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* My friends list */}
              {friendsLoading ? (
                <p className="text-text-muted text-center py-12">Loading...</p>
              ) : friends.length === 0 && pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-text-muted text-sm">
                  No friends yet
                </div>
              ) : friends.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {friends.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 py-3 border-b border-text-muted/10"
                      >
                        <Link to={`/profile/${f.id}`} className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-accent overflow-hidden flex items-center justify-center text-white font-bold">
                            {f.avatar_url ? (
                              <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
                            ) : (
                              f.display_name.charAt(0).toUpperCase()
                            )}
                          </div>
                        </Link>
                        <Link to={`/profile/${f.id}`} className="flex-1 min-w-0 hover:opacity-80 transition">
                          <p className="text-text font-semibold text-sm truncate">{f.display_name}</p>
                          <p className="text-text-muted text-xs">⭐ {Number(f.social_rating).toFixed(1)}</p>
                        </Link>
                        <button
                          onClick={() => handleUnfriend(f.id)}
                          className="text-text-muted/50 hover:text-error text-xs px-2.5 py-1.5 rounded-lg transition flex-shrink-0"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ===== SETTINGS TAB ===== */}
          {tab === "settings" && (
            <div>
              {editing ? (
                <form onSubmit={handleSave} className="space-y-5">
                  <h2 className="text-base font-bold text-text mb-6">Edit Profile</h2>
                  <div>
                    <label className="block text-sm text-text-muted mb-2 font-semibold">Display Name</label>
                    <input
                      type="text"
                      aria-label="Display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="input-luxe w-full rounded-lg px-4 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2 font-semibold">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="input-luxe w-full rounded-lg px-4 py-2.5 resize-none"
                      placeholder="Tell people about yourself..."
                    />
                    <p className="text-text-muted/40 text-xs mt-1 text-right">{bio.length}/500</p>
                  </div>
                  <div className="flex gap-3 pt-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary-luxe font-semibold px-6 py-2.5 rounded-lg transition disabled:opacity-50 flex-1"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditing(false); setDisplayName(user.display_name); setBio(user.bio || ""); }}
                      className="btn-secondary-luxe text-text-muted px-6 py-2.5 rounded-lg transition flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-base font-bold text-text">Settings</h2>
                    <button
                      onClick={() => setEditing(true)}
                      className="btn-secondary-luxe text-xs font-semibold px-4 py-1.5 rounded-lg transition"
                    >
                      Edit
                    </button>
                  </div>

                  {message && <p className="text-success text-xs mb-6 bg-success/10 px-4 py-2 rounded-lg">{message}</p>}

                  <div className="space-y-4">
                    <div className="border-b border-text-muted/10 pb-4">
                      <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Username</span>
                      <p className="text-text mt-1 text-sm">@{user.username}</p>
                    </div>
                    <div className="border-b border-text-muted/10 pb-4">
                      <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Email</span>
                      <p className="text-text mt-1 text-sm">{user.email}</p>
                    </div>
                    <div className="border-b border-text-muted/10 pb-4">
                      <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Bio</span>
                      <p className="text-text mt-1 text-sm">{user.bio || "—"}</p>
                    </div>
                    <div className="border-b border-text-muted/10 pb-4">
                      <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Member Since</span>
                      <p className="text-text mt-1 text-sm">{new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                  </div>

                  <ThemeControlSection />

                  <div className="mt-8 pt-6 border-t border-text-muted/10">
                    <button
                      onClick={logout}
                      className="bg-error/10 text-error hover:bg-error/20 font-semibold px-4 py-2.5 rounded-lg transition border border-error/20 text-sm w-full"
                    >
                      <Link to="/">Sign Out</Link>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-w-2xl w-full my-auto glass-panel rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Section */}
            <div className="flex-shrink-0 bg-black">
              <img
                src={lightbox.image_url}
                alt={lightbox.caption || "Photo"}
                className="w-full max-h-[60vh] object-contain"
              />
            </div>

            {/* Info and Comments Section */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {/* Photo Info */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(user?.display_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-text text-sm font-semibold truncate">{user?.display_name}</p>
                      {user?.username && <p className="text-text-muted text-xs">@{user.username}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-text text-sm font-semibold">❤️ {lightbox.like_count}</span>
                    <button
                      onClick={() => handleDeletePhoto(lightbox.id)}
                      className="text-error hover:text-error/80 transition text-sm"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
                {lightbox.caption && (
                  <p className="text-text text-sm mb-2">
                    <span className="font-semibold">{user?.display_name}:</span> {lightbox.caption}
                  </p>
                )}
                <p className="text-text-muted/60 text-xs">
                  {new Date(lightbox.created_at).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>

              {/* Comments Section */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {commentError && (
                  <div className="text-error text-xs bg-error/10 px-3 py-2 rounded">{commentError}</div>
                )}
                {loadingComments ? (
                  <p className="text-text-muted text-xs text-center py-4">Loading comments...</p>
                ) : comments.length === 0 ? (
                  <p className="text-text-muted text-xs text-center py-4">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="text-sm">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {comment.display_name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-muted text-xs">{comment.display_name || comment.username || "User"}</p>
                          <p className="text-text text-sm">{comment.comment_text}</p>
                          <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                            <span>❤️ {comment.like_count}</span>
                            {user && user.id === comment.user_id && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-error hover:text-error/80 transition"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <div className="p-4 border-t border-white/10 flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
                        handleAddComment();
                      }
                    }}
                    disabled={postingComment}
                    className="input-luxe flex-1 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={postingComment || !newComment.trim()}
                    className="btn-primary-luxe px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition"
                  >
                    {postingComment ? "..." : "Post"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-3xl hover:text-text-muted transition"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
