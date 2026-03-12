import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import api from "../lib/api";
import type { Photo, Rating, FriendUser, PendingFriendRequest } from "../types";

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

  // Ratings
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  // Friends
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [friendsTotal, setFriendsTotal] = useState(0);
  const [friendsPage, setFriendsPage] = useState(1);
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

  useEffect(() => {
    if (user) loadPhotos();
  }, [user, photosPage]);

  useEffect(() => {
    if (user && tab === "ratings") loadRatings();
    if (user && tab === "friends") { loadFriendsList(); loadPendingRequests(); }
  }, [user, tab]);

  useEffect(() => {
    if (user && tab === "friends") loadFriendsList();
  }, [friendsPage]);

  async function loadPhotos() {
    try {
      const res = await api.get(`/users/${user!.id}/photos?page=${photosPage}&limit=12`);
      setPhotos(res.data.data.photos);
      setPhotosTotal(res.data.data.total);
    } catch {} finally { setPhotosLoading(false); }
  }

  async function loadRatings() {
    try {
      const res = await api.get(`/users/${user!.id}/ratings`);
      setRatings(res.data.data.ratings);
    } catch {} finally { setRatingsLoading(false); }
  }

  async function loadFriendsList() {
    setFriendsLoading(true);
    try {
      const res = await api.get(`/friends/me?page=${friendsPage}&limit=20`);
      setFriends(res.data.data.friends);
      setFriendsTotal(res.data.data.total);
      setFriendCount(res.data.data.total);
    } catch {} finally { setFriendsLoading(false); }
  }

  async function loadPendingRequests() {
    setPendingLoading(true);
    try {
      const res = await api.get("/friends/me/pending");
      setPendingRequests(res.data.data.requests || []);
    } catch {} finally { setPendingLoading(false); }
  }

  async function handleAcceptFriend(requesterId: string) {
    setPendingActionId(requesterId);
    try {
      await api.patch(`/friends/${requesterId}/accept`);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requesterId));
      setFriendCount((c) => c + 1);
      loadFriendsList();
    } catch {} finally { setPendingActionId(null); }
  }

  async function handleDeclineFriend(requesterId: string) {
    setPendingActionId(requesterId);
    try {
      await api.patch(`/friends/${requesterId}/reject`);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requesterId));
    } catch {} finally { setPendingActionId(null); }
  }

  async function handleUnfriend(friendId: string) {
    try {
      await api.delete(`/friends/${friendId}`);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
      setFriendsTotal((t) => Math.max(0, t - 1));
      setFriendCount((c) => Math.max(0, c - 1));
    } catch {}
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
    } catch {} finally {
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
    } catch {} finally {
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
    } catch {}
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
    } catch (err: any) {
      setMessage(err.response?.data?.error?.message || "Update failed");
    } finally { setSaving(false); }
  }

  if (!user) return null;

  const ratingVal = Number(user.social_rating);
  const photoPages = Math.ceil(photosTotal / 12);

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero banner */}
      <div className="h-48 bg-gradient-to-br from-accent via-primary/40 to-accent/60 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(233,69,96,0.3),transparent_60%)]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10 pb-12">
        {/* Profile header card */}
        <div className="bg-surface rounded-2xl border border-text-muted/10 shadow-2xl shadow-black/30 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
              {/* Avatar with upload */}
              <div className="relative group -mt-20 sm:-mt-24 flex-shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-surface overflow-hidden bg-accent shadow-lg">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl text-white font-bold">
                      {user.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <span className="text-white text-xs font-semibold">
                    {avatarUploading ? "..." : "Change"}
                  </span>
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                {/* Online dot */}
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-success rounded-full border-[3px] border-surface" />
              </div>

              {/* Name & info */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-text">{user.display_name}</h1>
                <p className="text-text-muted text-sm">@{user.username}</p>
                {user.bio && (
                  <p className="text-text-muted/80 text-sm mt-2 max-w-md">{user.bio}</p>
                )}
              </div>

              {/* Rating badge */}
              <div className="flex-shrink-0 text-center">
                {user.total_ratings >= 3 ? (
                  <div className="bg-warning/10 border border-warning/20 rounded-xl px-5 py-3">
                    <div className="text-2xl font-bold text-warning">{ratingVal.toFixed(1)}</div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider">{user.total_ratings} ratings</div>
                  </div>
                ) : (
                  <div className="bg-surface-light rounded-xl px-5 py-3">
                    <div className="text-sm text-text-muted">No rating yet</div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats strip */}
            <div className="flex items-center justify-center sm:justify-start gap-5 mt-6 pt-6 border-t border-text-muted/10 flex-wrap">
              <div className="text-center">
                <div className="text-xl font-bold text-text">{user.parties_hosted}</div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Hosted</div>
              </div>
              <div className="w-px h-8 bg-text-muted/10 hidden sm:block" />
              <div className="text-center">
                <div className="text-xl font-bold text-text">{user.parties_attended}</div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Attended</div>
              </div>
              <div className="w-px h-8 bg-text-muted/10 hidden sm:block" />
              <div className="text-center">
                <div className="text-xl font-bold text-text">{photosTotal}</div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Photos</div>
              </div>
              <div className="w-px h-8 bg-text-muted/10 hidden sm:block" />
              <div className="text-center">
                <div className="text-xl font-bold text-text">{user.total_ratings}</div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Reviews</div>
              </div>
              <div className="w-px h-8 bg-text-muted/10 hidden sm:block" />
              <button onClick={() => setTab("friends")} className="text-center hover:opacity-80 transition">
                <div className="text-xl font-bold text-text">{friendCount}</div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Friends</div>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-6 bg-surface rounded-xl p-1 border border-text-muted/10">
          {(["photos", "ratings", "friends", "settings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition ${
                tab === t
                  ? "bg-primary text-white shadow"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {t === "photos" ? "📷 Photos" : t === "ratings" ? "⭐ Ratings" : t === "friends" ? `👥 Friends${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}` : "⚙️ Settings"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {/* ===== PHOTOS TAB ===== */}
          {tab === "photos" && (
            <div>
              {/* Upload bar */}
              <div className="bg-surface rounded-xl border border-text-muted/10 p-4 mb-6 flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="flex-1 bg-bg border border-text-muted/20 text-text rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition"
                />
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-50 flex-shrink-0"
                >
                  {uploading ? "Uploading..." : "📷 Upload Photo"}
                </button>
              </div>

              {photosLoading ? (
                <p className="text-text-muted text-center py-12">Loading photos...</p>
              ) : photos.length === 0 ? (
                <div className="text-center py-16 bg-surface rounded-xl border border-dashed border-text-muted/20">
                  <p className="text-text-muted text-lg mb-1">No photos yet</p>
                  <p className="text-text-muted/50 text-sm">Upload your first photo to show it on your profile</p>
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
                              <span className="text-white/80 text-xs truncate max-w-[60%]">{photo.caption}</span>
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
                      <span className="px-3 py-1.5 text-sm text-text-muted">{photosPage} / {photoPages}</span>
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
                  <p className="text-text-muted text-lg mb-1">No ratings yet</p>
                  <p className="text-text-muted/50 text-sm">Attend parties and get rated by other attendees</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ratings.map((r) => (
                    <div key={r.id} className="bg-surface rounded-xl border border-text-muted/10 p-5 flex items-start gap-4">
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
                            <span key={i} className={`text-sm ${i < r.score ? "text-warning" : "text-text-muted/20"}`}>★</span>
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
              {/* Pending incoming requests */}
              {(pendingLoading || pendingRequests.length > 0) && (
                <div className="bg-surface rounded-xl border border-text-muted/10 p-5 mb-4">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    {pendingLoading
                      ? "Loading..."
                      : `${pendingRequests.length} Pending Request${pendingRequests.length !== 1 ? "s" : ""}`}
                  </h3>
                  {!pendingLoading && (
                    <div className="space-y-3">
                      {pendingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center gap-3 py-2"
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
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleAcceptFriend(req.id)}
                              disabled={pendingActionId === req.id}
                              className="bg-success/20 hover:bg-success/30 text-success border border-success/30 text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDeclineFriend(req.id)}
                              disabled={pendingActionId === req.id}
                              className="bg-error/10 hover:bg-error/20 text-error border border-error/20 text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                            >
                              Decline
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
                <p className="text-text-muted text-center py-12">Loading friends...</p>
              ) : friends.length === 0 && pendingRequests.length === 0 ? (
                <div className="text-center py-16 bg-surface rounded-xl border border-dashed border-text-muted/20">
                  <p className="text-text-muted text-lg mb-1">No friends yet</p>
                  <p className="text-text-muted/50 text-sm">Browse events and connect with other attendees</p>
                </div>
              ) : friends.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {friends.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 bg-surface rounded-xl border border-text-muted/10 p-4"
                      >
                        <Link to={`/profile/${f.id}`} className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-accent overflow-hidden flex items-center justify-center text-white text-lg font-bold">
                            {f.avatar_url ? (
                              <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
                            ) : (
                              f.display_name.charAt(0).toUpperCase()
                            )}
                          </div>
                        </Link>
                        <Link to={`/profile/${f.id}`} className="flex-1 min-w-0 hover:opacity-80 transition">
                          <p className="text-text font-semibold text-sm truncate">{f.display_name}</p>
                          <p className="text-text-muted text-xs">@{f.username} · ⭐ {Number(f.social_rating).toFixed(1)}</p>
                        </Link>
                        <button
                          onClick={() => handleUnfriend(f.id)}
                          className="text-text-muted/50 hover:text-error text-xs px-2 py-1 rounded-lg hover:bg-error/10 transition flex-shrink-0"
                          title="Unfriend"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  {Math.ceil(friendsTotal / 20) > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                      <button
                        onClick={() => setFriendsPage((p) => Math.max(1, p - 1))}
                        disabled={friendsPage === 1}
                        className="px-3 py-1.5 text-sm rounded-lg bg-surface text-text-muted disabled:opacity-40 border border-text-muted/10"
                      >
                        Prev
                      </button>
                      <span className="px-3 py-1.5 text-sm text-text-muted">
                        {friendsPage} / {Math.ceil(friendsTotal / 20)}
                      </span>
                      <button
                        onClick={() => setFriendsPage((p) => Math.min(Math.ceil(friendsTotal / 20), p + 1))}
                        disabled={friendsPage === Math.ceil(friendsTotal / 20)}
                        className="px-3 py-1.5 text-sm rounded-lg bg-surface text-text-muted disabled:opacity-40 border border-text-muted/10"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* ===== SETTINGS TAB ===== */}
          {tab === "settings" && (
            <div className="bg-surface rounded-2xl border border-text-muted/10 p-6 sm:p-8">
              {editing ? (
                <form onSubmit={handleSave} className="space-y-5">
                  <h2 className="text-lg font-bold text-text mb-4">Edit Profile</h2>
                  <div>
                    <label className="block text-sm text-text-muted mb-1.5">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-bg border border-text-muted/20 rounded-lg px-4 py-3 text-text focus:outline-none focus:border-primary transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1.5">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      maxLength={500}
                      className="w-full bg-bg border border-text-muted/20 rounded-lg px-4 py-3 text-text focus:outline-none focus:border-primary transition resize-none"
                      placeholder="Tell people about yourself..."
                    />
                    <p className="text-text-muted/40 text-xs mt-1 text-right">{bio.length}/500</p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-primary hover:bg-primary-hover text-white font-semibold px-8 py-2.5 rounded-lg transition disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditing(false); setDisplayName(user.display_name); setBio(user.bio || ""); }}
                      className="bg-surface-light text-text-muted px-8 py-2.5 rounded-lg border border-text-muted/20 transition hover:bg-bg"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-text">Profile Info</h2>
                    <button
                      onClick={() => setEditing(true)}
                      className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
                    >
                      Edit Profile
                    </button>
                  </div>

                  {message && <p className="text-success text-sm mb-4 bg-success/10 px-4 py-2 rounded-lg">{message}</p>}

                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-text-muted uppercase tracking-wider">Username</span>
                      <p className="text-text mt-0.5">@{user.username}</p>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted uppercase tracking-wider">Email</span>
                      <p className="text-text mt-0.5">{user.email}</p>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted uppercase tracking-wider">Bio</span>
                      <p className="text-text mt-0.5">{user.bio || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted uppercase tracking-wider">Member since</span>
                      <p className="text-text mt-0.5">{new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-text-muted/10">
                    <button
                      onClick={logout}
                      className="bg-error/10 text-error hover:bg-error/20 font-semibold px-6 py-2.5 rounded-lg transition border border-error/20"
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
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-w-3xl w-full bg-surface rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.image_url}
              alt={lightbox.caption || "Photo"}
              className="w-full max-h-[70vh] object-contain bg-black"
            />
            <div className="p-5 flex items-center justify-between">
              <div>
                <span className="text-text text-sm">❤️ {lightbox.like_count} likes</span>
                {lightbox.caption && (
                  <p className="text-text-muted text-sm mt-1">{lightbox.caption}</p>
                )}
              </div>
              <button
                onClick={() => handleDeletePhoto(lightbox.id)}
                className="text-error hover:bg-error/10 text-sm font-semibold px-4 py-2 rounded-lg transition border border-error/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
