import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { useTheme } from "../context/use-theme";
import api from "../lib/api";
import type { Photo, Rating, FriendUser, PendingFriendRequest } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Grid3x3, Star, Users, Settings, Heart, Loader2, X, Trash2, Send, Moon, Sun, Edit3, ChevronLeft, ChevronRight, LogOut } from "lucide-react";

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
    if (user) { setDisplayName(user.display_name); setBio(user.bio || ""); }
  }, [user]);

  const loadPhotos = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get(`/users/${user!.id}/photos?page=${photosPage}&limit=36`);
      const loadedPhotos: Photo[] = res.data.data.photos;
      setPhotos(loadedPhotos);
      setPhotosTotal(res.data.data.total);
      const uniquePartyIds = Array.from(new Set(loadedPhotos.map((p) => p.party_id).filter((partyId): partyId is string => Boolean(partyId))));
      if (uniquePartyIds.length > 0) {
        const titleEntries = await Promise.all(uniquePartyIds.map(async (id) => {
          try { const partyRes = await api.get(`/parties/${id}`); return [id, partyRes.data.data.party?.title || "Event"] as const; }
          catch { return [id, "Event"] as const; }
        }));
        setPartyTitles((prev) => ({ ...prev, ...Object.fromEntries(titleEntries) }));
      }
    } catch (error) { console.error("Failed to load profile photos:", getApiErrorMessage(error, "Unknown profile photos error")); }
    finally { setPhotosLoading(false); }
  }, [photosPage, user]);

  const loadRatings = useCallback(async () => {
    if (!user) return;
    try { const res = await api.get(`/users/${user!.id}/ratings`); setRatings(res.data.data.ratings); }
    catch (error) { console.error("Failed to load profile ratings:", getApiErrorMessage(error, "Unknown profile ratings error")); }
    finally { setRatingsLoading(false); }
  }, [user]);

  const loadFriendsList = useCallback(async () => {
    setFriendsLoading(true);
    try { const res = await api.get("/friends/me?limit=100"); setFriends(res.data.data.friends); setFriendCount(res.data.data.total); }
    catch (error) { console.error("Failed to load friends list:", getApiErrorMessage(error, "Unknown friends list error")); }
    finally { setFriendsLoading(false); }
  }, []);

  const loadPendingRequests = useCallback(async () => {
    setPendingLoading(true);
    try { const res = await api.get("/friends/me/pending"); setPendingRequests(res.data.data.requests || []); }
    catch (error) { console.error("Failed to load pending friend requests:", getApiErrorMessage(error, "Unknown pending requests error")); }
    finally { setPendingLoading(false); }
  }, []);

  useEffect(() => { if (user) loadPhotos(); }, [loadPhotos, user]);
  useEffect(() => {
    if (user && tab === "ratings") loadRatings();
    if (user && tab === "friends") { loadFriendsList(); loadPendingRequests(); }
  }, [loadFriendsList, loadPendingRequests, loadRatings, tab, user]);
  useEffect(() => { if (user && tab === "friends") loadFriendsList(); }, [loadFriendsList, tab, user]);

  async function handleAcceptFriend(requesterId: string) {
    setPendingActionId(requesterId);
    try { await api.patch(`/friends/${requesterId}/accept`); setPendingRequests((prev) => prev.filter((r) => r.id !== requesterId)); setFriendCount((c) => c + 1); loadFriendsList(); }
    catch (error) { console.error("Failed to accept friend request:", getApiErrorMessage(error, "Unknown accept friend error")); }
    finally { setPendingActionId(null); }
  }

  async function handleDeclineFriend(requesterId: string) {
    setPendingActionId(requesterId);
    try { await api.patch(`/friends/${requesterId}/reject`); setPendingRequests((prev) => prev.filter((r) => r.id !== requesterId)); }
    catch (error) { console.error("Failed to reject friend request:", getApiErrorMessage(error, "Unknown reject friend error")); }
    finally { setPendingActionId(null); }
  }

  async function handleUnfriend(friendId: string) {
    try { await api.delete(`/friends/${friendId}`); setFriends((prev) => prev.filter((f) => f.id !== friendId)); setFriendCount((c) => Math.max(0, c - 1)); }
    catch (error) { console.error("Failed to unfriend user:", getApiErrorMessage(error, "Unknown unfriend error")); }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setAvatarUploading(true);
    try { const fd = new FormData(); fd.append("avatar", file); await api.put("/users/me/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } }); await refreshUser(); }
    catch (error) { console.error("Failed to upload avatar:", getApiErrorMessage(error, "Unknown avatar upload error")); }
    finally { setAvatarUploading(false); if (avatarInputRef.current) avatarInputRef.current.value = ""; }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const fd = new FormData(); fd.append("image", file); if (caption.trim()) fd.append("caption", caption.trim()); await api.post("/photos", fd, { headers: { "Content-Type": "multipart/form-data" } }); setCaption(""); loadPhotos(); }
    catch (error) { console.error("Failed to upload profile photo:", getApiErrorMessage(error, "Unknown profile photo upload error")); }
    finally { setUploading(false); if (photoInputRef.current) photoInputRef.current.value = ""; }
  }

  async function handleDeletePhoto(photoId: string) {
    try { await api.delete(`/photos/${photoId}`); setPhotos((p) => p.filter((x) => x.id !== photoId)); setPhotosTotal((t) => t - 1); setLightbox(null); }
    catch (error) { console.error("Failed to delete profile photo:", getApiErrorMessage(error, "Unknown delete profile photo error")); }
  }

  async function loadComments(photoId: string) {
    setLoadingComments(true); setCommentError("");
    try { const res = await api.get(`/photos/${photoId}/comments`); setComments(res.data.data.comments || []); }
    catch (error) { console.error("Failed to load comments:", getApiErrorMessage(error, "Unknown error")); setCommentError("Failed to load comments"); setComments([]); }
    finally { setLoadingComments(false); }
  }

  async function handleAddComment() {
    if (!lightbox || !newComment.trim()) return;
    setPostingComment(true); setCommentError("");
    try { const res = await api.post(`/photos/${lightbox.id}/comments`, { comment_text: newComment.trim() }); setComments([res.data.data.comment, ...comments]); setNewComment(""); }
    catch (error) { setCommentError(getApiErrorMessage(error, "Failed to post comment")); }
    finally { setPostingComment(false); }
  }

  async function handleDeleteComment(commentId: string) {
    try { await api.delete(`/photos/comments/${commentId}`); setComments(comments.filter((c) => c.id !== commentId)); }
    catch (error) { setCommentError(getApiErrorMessage(error, "Failed to delete comment")); }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMessage("");
    try { await api.put("/users/me", { display_name: displayName, bio }); await refreshUser(); setMessage("Profile updated!"); setEditing(false); }
    catch (error: unknown) { setMessage(getApiErrorMessage(error, "Update failed")); }
    finally { setSaving(false); }
  }

  if (!user) return null;

  const ratingVal = Number(user.social_rating);
  const profilePhotos = photos.filter((photo) => !photo.party_id);
  const partyPhotos = photos.filter((photo) => photo.party_id);
  const highlightPartyIds = Array.from(new Set(partyPhotos.map((photo) => photo.party_id).filter((partyId): partyId is string => Boolean(partyId))));
  const activeEventPhotos = selectedHighlightPartyId ? partyPhotos.filter((photo) => photo.party_id === selectedHighlightPartyId) : profilePhotos;
  const photoPages = Math.ceil(photosTotal / 36);

  const tabIcons = {
    photos: Grid3x3,
    ratings: Heart,
    friends: Users,
    settings: Settings,
  };

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Profile header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center py-6">
          {/* Avatar */}
          <div className="relative group mb-5 shrink-0">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary via-accent to-hot p-[3px] shadow-2xl shadow-primary/20">
              <div className="w-full h-full rounded-full bg-bg overflow-hidden">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-text font-bold">
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
            >
              <Camera className="w-5 h-5 text-white" />
            </button>
            <input ref={avatarInputRef} type="file" aria-label="Upload avatar image" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />
            <div className="absolute bottom-1 right-1 w-4 h-4 bg-success rounded-full border-[2.5px] border-bg" />
          </div>

          <h2 className="text-2xl font-bold text-text mb-0.5 tracking-tight">{user.display_name}</h2>
          <p className="text-text-muted text-sm">@{user.username}</p>
          {user.bio && <p className="text-text-muted text-sm mt-2 max-w-sm mx-auto">{user.bio}</p>}
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-6 py-5 border-y border-primary/[0.06] mb-5">
          <div className="text-center">
            <div className="text-2xl font-bold text-text">{photosTotal}</div>
            <div className="text-[10px] text-text-dim uppercase tracking-wider font-bold mt-1">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-text">{friendCount}</div>
            <div className="text-[10px] text-text-dim uppercase tracking-wider font-bold mt-1">Friends</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">{ratingVal.toFixed(1)}</div>
            <div className="text-[10px] text-text-dim uppercase tracking-wider font-bold mt-1">Rating</div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-3 mb-6">
          <button onClick={() => setTab("friends")} className="flex-1 bg-surface-light border border-primary/[0.08] text-text font-semibold py-2.5 rounded-xl hover:border-primary/15 transition text-sm flex items-center justify-center gap-1.5">
            <Users className="w-4 h-4" /> Friends
          </button>
          <button onClick={() => setTab("settings")} className="flex-1 bg-surface-light border border-primary/[0.08] text-text font-semibold py-2.5 rounded-xl hover:border-primary/15 transition text-sm flex items-center justify-center gap-1.5">
            <Edit3 className="w-4 h-4" /> About
          </button>
        </div>

        {/* Tab icons */}
        <div className="flex gap-8 border-t border-primary/[0.06] justify-center">
          {(["photos", "ratings", "friends", "settings"] as const).map((t) => {
            const Icon = tabIcons[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-4 transition ${tab === t ? "text-text border-b-2 border-primary" : "text-text-dim hover:text-text border-b-2 border-transparent"}`}
                title={t.charAt(0).toUpperCase() + t.slice(1)}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {/* PHOTOS */}
          {tab === "photos" && (
            <div>
              {highlightPartyIds.length > 0 && (
                <div className="mb-8">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-bold mb-4">Highlights</p>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {highlightPartyIds.map((partyId) => {
                      const eventPhotos = partyPhotos.filter((photo) => photo.party_id === partyId);
                      const cover = eventPhotos[0];
                      const isActive = selectedHighlightPartyId === partyId;
                      return (
                        <button key={partyId} onClick={() => setSelectedHighlightPartyId((prev) => (prev === partyId ? null : partyId))} className="shrink-0 flex flex-col items-center gap-2 group" title={partyTitles[partyId] || "Event"}>
                          <div className={`p-[3px] rounded-full transition ${isActive ? "bg-gradient-to-br from-primary via-warning to-accent" : "bg-text-dim/20 group-hover:bg-primary/40"}`}>
                            <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-bg bg-surface">
                              {cover ? <img src={cover.image_url} alt={partyTitles[partyId] || "Event"} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-text-dim text-xs">E</div>}
                            </div>
                          </div>
                          <span className="text-[11px] text-text-dim max-w-[80px] truncate text-center">{partyTitles[partyId] || "Event"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload */}
              <div className="glass-panel rounded-2xl p-3 mb-6 flex items-center gap-2">
                <input type="text" aria-label="Photo caption" placeholder="Add a caption..." value={caption} onChange={(e) => setCaption(e.target.value)} className="input-luxe flex-1 rounded-xl px-4 py-2.5 text-sm" />
                <input ref={photoInputRef} type="file" aria-label="Upload profile photo" title="Upload profile photo" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} className="hidden" />
                <button onClick={() => photoInputRef.current?.click()} disabled={uploading} className="btn-primary-luxe text-sm font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-50 shrink-0 flex items-center gap-1.5">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {uploading ? "..." : "Add"}
                </button>
              </div>

              {photosLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              ) : activeEventPhotos.length === 0 ? (
                <div className="text-center py-12 text-text-dim text-sm">{selectedHighlightPartyId ? "No photos in this highlight" : "No posts yet"}</div>
              ) : (
                <>
                  {selectedHighlightPartyId && (
                    <button onClick={() => setSelectedHighlightPartyId(null)} className="text-xs px-4 py-2 rounded-xl btn-secondary-luxe mb-4 font-semibold">View All</button>
                  )}
                  <div className="grid grid-cols-3 gap-1">
                    {activeEventPhotos.map((photo) => (
                      <div key={photo.id} className="aspect-square bg-surface rounded-sm overflow-hidden cursor-pointer group relative"
                        onClick={() => { setLightbox(photo); setComments([]); setNewComment(""); setCommentError(""); loadComments(photo.id); }}>
                        <img src={photo.image_url} alt={photo.caption || "Photo"} className="w-full h-full object-cover transition group-hover:scale-105 duration-300" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex gap-4">
                            <Heart className="w-6 h-6 text-white" />
                            <span className="text-white text-sm font-bold">{photo.like_count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {photoPages > 1 && !selectedHighlightPartyId && (
                    <div className="flex justify-center items-center gap-3 mt-8">
                      <button onClick={() => setPhotosPage((p) => Math.max(1, p - 1))} disabled={photosPage === 1} className="btn-secondary-luxe p-2 rounded-xl disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                      <span className="text-text-muted text-sm font-semibold">{photosPage} / {photoPages}</span>
                      <button onClick={() => setPhotosPage((p) => Math.min(photoPages, p + 1))} disabled={photosPage === photoPages} className="btn-secondary-luxe p-2 rounded-xl disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* RATINGS */}
          {tab === "ratings" && (
            <div>
              {ratingsLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              : ratings.length === 0 ? <div className="text-center py-12 text-text-dim text-sm">No ratings yet</div>
              : (
                <div className="space-y-3">
                  {ratings.map((r, i) => (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.25) }} className="glass-panel rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warning to-hot p-[1.5px] shrink-0">
                          <div className="w-full h-full rounded-full bg-bg flex items-center justify-center text-sm font-bold text-text">
                            {(r.rater_display_name || "?").charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-text font-bold text-sm">{r.rater_display_name}</span>
                            <span className="text-text-dim text-[10px] ml-auto">{timeAgo(r.created_at)}</span>
                          </div>
                          <div className="flex gap-0.5 mb-1.5">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < r.score ? "text-warning fill-current" : "text-text-dim/20"}`} />
                            ))}
                          </div>
                          {r.comment && <p className="text-text-muted text-xs">{r.comment}</p>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FRIENDS */}
          {tab === "friends" && (
            <div>
              {(pendingLoading || pendingRequests.length > 0) && (
                <div className="mb-8">
                  <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                    {pendingLoading ? "Loading..." : `Pending (${pendingRequests.length})`}
                  </h3>
                  {!pendingLoading && (
                    <div className="space-y-2">
                      {pendingRequests.map((req) => (
                        <div key={req.id} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
                          <Link to={`/profile/${req.id}`} className="shrink-0">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px]">
                              <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-text text-sm font-bold">
                                {req.avatar_url ? <img src={req.avatar_url} alt={req.display_name} className="w-full h-full object-cover" /> : req.display_name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          </Link>
                          <Link to={`/profile/${req.id}`} className="flex-1 min-w-0 hover:opacity-80 transition">
                            <p className="text-text font-bold text-sm truncate">{req.display_name}</p>
                            <p className="text-text-muted text-xs">@{req.username}</p>
                          </Link>
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => handleAcceptFriend(req.id)} disabled={pendingActionId === req.id} className="bg-primary/15 hover:bg-primary/25 text-primary font-bold text-xs px-3 py-2 rounded-xl transition disabled:opacity-50">Accept</button>
                            <button onClick={() => handleDeclineFriend(req.id)} disabled={pendingActionId === req.id} className="bg-text-dim/10 text-text-muted font-semibold text-xs px-3 py-2 rounded-xl transition disabled:opacity-50">Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {friendsLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              : friends.length === 0 && pendingRequests.length === 0 ? <div className="text-center py-12 text-text-dim text-sm">No friends yet</div>
              : friends.length > 0 ? (
                <div className="space-y-2">
                  {friends.map((f, i) => (
                    <motion.div key={f.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.03, 0.2) }}
                      className="glass-panel rounded-2xl p-4 flex items-center gap-3">
                      <Link to={`/profile/${f.id}`} className="shrink-0">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px]">
                          <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-text font-bold text-sm">
                            {f.avatar_url ? <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" /> : f.display_name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      </Link>
                      <Link to={`/profile/${f.id}`} className="flex-1 min-w-0 hover:opacity-80 transition">
                        <p className="text-text font-bold text-sm truncate">{f.display_name}</p>
                        <p className="text-text-muted text-xs flex items-center gap-1"><Star className="w-3 h-3 text-warning fill-current" /> {Number(f.social_rating).toFixed(1)}</p>
                      </Link>
                      <button onClick={() => handleUnfriend(f.id)} className="text-text-dim hover:text-error text-xs p-2 rounded-xl transition shrink-0" title="Remove">
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* SETTINGS */}
          {tab === "settings" && (
            <div>
              {editing ? (
                <form onSubmit={handleSave} className="space-y-5">
                  <h2 className="text-base font-bold text-text mb-6">Edit Profile</h2>
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Display Name</label>
                    <input type="text" aria-label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-luxe w-full rounded-xl px-4 py-3" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Bio</label>
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} className="input-luxe w-full rounded-xl px-4 py-3 resize-none" placeholder="Tell people about yourself..." />
                    <p className="text-text-dim text-[10px] mt-1 text-right">{bio.length}/500</p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={saving} className="btn-primary-luxe font-bold px-6 py-3 rounded-xl transition disabled:opacity-50 flex-1">{saving ? "Saving..." : "Save"}</button>
                    <button type="button" onClick={() => { setEditing(false); setDisplayName(user.display_name); setBio(user.bio || ""); }} className="btn-secondary-luxe px-6 py-3 rounded-xl transition flex-1">Cancel</button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-base font-bold text-text">Settings</h2>
                    <button onClick={() => setEditing(true)} className="btn-secondary-luxe text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  {message && <p className="text-success text-xs mb-6 bg-success/10 border border-success/15 px-4 py-3 rounded-xl">{message}</p>}
                  <div className="space-y-4">
                    {[
                      { label: "Username", value: `@${user.username}` },
                      { label: "Email", value: user.email },
                      { label: "Bio", value: user.bio || "—" },
                      { label: "Member Since", value: new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) },
                    ].map((item) => (
                      <div key={item.label} className="border-b border-primary/[0.06] pb-4">
                        <span className="text-[10px] text-text-dim uppercase tracking-wider font-bold">{item.label}</span>
                        <p className="text-text mt-1 text-sm">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Theme */}
                  <div className="mt-8 pt-6 border-t border-primary/[0.06]">
                    <span className="text-[10px] text-text-dim uppercase tracking-wider font-bold block mb-4">Theme</span>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => toggleTheme("dark")} className={`px-4 py-3 rounded-xl font-bold text-sm transition border flex items-center justify-center gap-2 ${theme === "dark" ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-surface-light text-text border-primary/[0.08] hover:border-primary/15"}`}>
                        <Moon className="w-4 h-4" /> Dark
                      </button>
                      <button onClick={() => toggleTheme("light")} className={`px-4 py-3 rounded-xl font-bold text-sm transition border flex items-center justify-center gap-2 ${theme === "light" ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-surface-light text-text border-primary/[0.08] hover:border-primary/15"}`}>
                        <Sun className="w-4 h-4" /> Light
                      </button>
                    </div>
                  </div>

                  {/* Sign out */}
                  <div className="mt-8 pt-6 border-t border-primary/[0.06]">
                    <button onClick={logout} className="bg-error/10 text-error hover:bg-error/20 font-bold px-4 py-3 rounded-xl transition border border-error/15 text-sm w-full flex items-center justify-center gap-2">
                      <LogOut className="w-4 h-4" />
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
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-bg/95 backdrop-blur-lg z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setLightbox(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-2xl w-full my-auto glass-panel rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}>
              <div className="shrink-0 bg-black"><img src={lightbox.image_url} alt={lightbox.caption || "Photo"} className="w-full max-h-[60vh] object-contain" /></div>
              <div className="flex-1 overflow-y-auto flex flex-col">
                <div className="p-5 border-b border-primary/[0.06]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px] shrink-0">
                        <div className="w-full h-full rounded-full bg-bg flex items-center justify-center text-sm font-bold text-text">
                          {(user?.display_name || "?").charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-text text-sm font-bold truncate">{user?.display_name}</p>
                        {user?.username && <p className="text-text-muted text-xs">@{user.username}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-text text-sm font-semibold flex items-center gap-1"><Heart className="w-4 h-4 text-hot" /> {lightbox.like_count}</span>
                      <button onClick={() => handleDeletePhoto(lightbox.id)} className="text-error hover:text-error/80 transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {lightbox.caption && <p className="text-text text-sm"><span className="font-bold">{user?.display_name}:</span> <span className="text-text-muted">{lightbox.caption}</span></p>}
                  <p className="text-text-dim text-[10px] mt-2">{new Date(lightbox.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {commentError && <div className="text-error text-xs bg-error/10 px-3 py-2 rounded-xl">{commentError}</div>}
                  {loadingComments ? <div className="flex items-center justify-center gap-2 py-4"><Loader2 className="w-4 h-4 text-primary animate-spin" /><span className="text-text-muted text-xs">Loading comments...</span></div>
                  : comments.length === 0 ? <p className="text-text-dim text-xs text-center py-4">No comments yet</p>
                  : comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent p-[1px] shrink-0">
                        <div className="w-full h-full rounded-full bg-bg flex items-center justify-center text-[10px] font-bold text-text">{comment.display_name?.charAt(0).toUpperCase() || "?"}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs"><span className="text-text font-bold mr-1">{comment.display_name || comment.username || "User"}</span><span className="text-text-muted">{comment.comment_text}</span></p>
                        <div className="flex items-center gap-2 text-[10px] text-text-dim mt-1">
                          <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" /> {comment.like_count}</span>
                          {user && user.id === comment.user_id && <button onClick={() => handleDeleteComment(comment.id)} className="text-error hover:text-error/80 transition">Delete</button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-primary/[0.06] shrink-0">
                  <div className="flex gap-2">
                    <input type="text" placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && newComment.trim()) handleAddComment(); }}
                      disabled={postingComment} className="input-luxe flex-1 rounded-xl px-4 py-2.5 text-sm" />
                    <button onClick={handleAddComment} disabled={postingComment || !newComment.trim()} className="btn-primary-luxe px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center gap-1">
                      {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
            <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-bg/60 backdrop-blur-md border border-primary/10 flex items-center justify-center text-text hover:bg-bg/80 transition z-10">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
