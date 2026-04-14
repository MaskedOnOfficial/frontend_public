import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import api from "../lib/api";
import type { Photo, Rating, FriendUser, PendingFriendRequest } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { useBackButton } from "../lib/use-back-button";
import { isNative } from "../lib/capacitor";
import { takePhoto } from "../lib/native-camera";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Grid3x3, Star, Users, Heart, Loader2, X, Trash2,
  Edit3, ChevronLeft, ChevronRight, Settings, LayoutDashboard,
  PartyPopper, Award, ImagePlus, Sparkles, Check, UserPlus, MessageCircle, ArrowLeft
} from "lucide-react";

/* helpers */

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

/* main */

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const feedPhotoRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [tab, setTab] = useState<"photos" | "ratings" | "friends">("photos");
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosTotal, setPhotosTotal] = useState(0);
  const [photosPage, setPhotosPage] = useState(1);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [feedStartIndex, setFeedStartIndex] = useState<number | null>(null);
  const [activeCommentPhotoId, setActiveCommentPhotoId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [partyTitles, setPartyTitles] = useState<Record<string, string>>({});
  const [storyPartyId, setStoryPartyId] = useState<string | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);

  // Ratings
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  // Friends
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Android back button: close overlays in reverse z-index order
  useBackButton(!!storyPartyId, useCallback(() => { setStoryPartyId(null); setStoryIndex(0); }, []));
  useBackButton(!storyPartyId && activeCommentPhotoId !== null, useCallback(() => { setActiveCommentPhotoId(null); setComments([]); setNewComment(""); setCommentError(""); }, []));
  useBackButton(!storyPartyId && activeCommentPhotoId === null && feedStartIndex !== null, useCallback(() => { setFeedStartIndex(null); setActiveCommentPhotoId(null); setComments([]); setNewComment(""); setCommentError(""); }, []));

  useEffect(() => {
    if (user) { setDisplayName(user.display_name); setBio(user.bio || ""); }
  }, [user]);

  useEffect(() => {
    if (user) {
      api.get("/friends/me?limit=1")
        .then((res) => setFriendCount(res.data.data.total))
        .catch(() => setFriendCount(0));
    }
  }, [user]);

  const loadPhotos = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get(`/users/${user.id}/photos?page=${photosPage}&limit=36`);
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
    setRatingsLoading(true);
    try { const res = await api.get(`/users/${user.id}/ratings`); setRatings(res.data.data.ratings); }
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

  async function handleAcceptFriend(requesterId: string) {
    setPendingActionId(requesterId);
    try { await api.patch(`/friends/${requesterId}/accept`); setPendingRequests((prev) => prev.filter((r) => r.id !== requesterId)); setFriendCount((c) => (c ?? 0) + 1); loadFriendsList(); showToast("Friend request accepted!"); }
    catch (error) { showToast(getApiErrorMessage(error, "Failed to accept"), "error"); }
    finally { setPendingActionId(null); }
  }

  async function handleDeclineFriend(requesterId: string) {
    setPendingActionId(requesterId);
    try { await api.patch(`/friends/${requesterId}/reject`); setPendingRequests((prev) => prev.filter((r) => r.id !== requesterId)); showToast("Request declined"); }
    catch (error) { showToast(getApiErrorMessage(error, "Failed to decline"), "error"); }
    finally { setPendingActionId(null); }
  }

  async function handleUnfriend(friendId: string) {
    try { await api.delete(`/friends/${friendId}`); setFriends((prev) => prev.filter((f) => f.id !== friendId)); setFriendCount((c) => Math.max(0, (c ?? 1) - 1)); showToast("Friend removed"); }
    catch (error) { showToast(getApiErrorMessage(error, "Failed to unfriend"), "error"); }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    await uploadAvatarFile(file);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  async function uploadAvatarFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { showToast("File too large (max 5 MB)", "error"); return; }
    setAvatarUploading(true);
    try { const fd = new FormData(); fd.append("avatar", file); await api.put("/users/me/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } }); await refreshUser(); showToast("Avatar updated!"); }
    catch (error) { showToast(getApiErrorMessage(error, "Upload failed"), "error"); }
    finally { setAvatarUploading(false); }
  }

  async function handleNativeAvatarUpload() {
    const file = await takePhoto();
    if (file) await uploadAvatarFile(file);
  }

  function triggerAvatarUpload() {
    if (isNative()) { handleNativeAvatarUpload(); } else { avatarInputRef.current?.click(); }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    await uploadPhotoFile(file);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  async function uploadPhotoFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { showToast("File too large (max 5 MB)", "error"); return; }
    setUploading(true);
    try { const fd = new FormData(); fd.append("image", file); if (caption.trim()) fd.append("caption", caption.trim()); await api.post("/photos", fd, { headers: { "Content-Type": "multipart/form-data" } }); setCaption(""); loadPhotos(); showToast("Photo uploaded!"); }
    catch (error) { showToast(getApiErrorMessage(error, "Upload failed"), "error"); }
    finally { setUploading(false); }
  }

  async function handleNativePhotoUpload() {
    const file = await takePhoto();
    if (file) await uploadPhotoFile(file);
  }

  function triggerPhotoUpload() {
    if (isNative()) { handleNativePhotoUpload(); } else { photoInputRef.current?.click(); }
  }

  async function handleDeletePhoto(photoId: string) {
    try { await api.delete(`/photos/${photoId}`); setPhotos((p) => p.filter((x) => x.id !== photoId)); setPhotosTotal((t) => t - 1); if (activeCommentPhotoId === photoId) { setActiveCommentPhotoId(null); setComments([]); } showToast("Photo deleted"); }
    catch (error) { showToast(getApiErrorMessage(error, "Delete failed"), "error"); }
  }

  async function loadComments(photoId: string) {
    setLoadingComments(true); setCommentError("");
    try { const res = await api.get(`/photos/${photoId}/comments`); setComments(res.data.data.comments || []); }
    catch { setCommentError("Failed to load comments"); setComments([]); }
    finally { setLoadingComments(false); }
  }

  async function handleAddComment() {
    if (!activeCommentPhotoId || !newComment.trim()) return;
    setPostingComment(true); setCommentError("");
    try { const res = await api.post(`/photos/${activeCommentPhotoId}/comments`, { comment_text: newComment.trim() }); setComments([res.data.data.comment, ...comments]); setNewComment(""); }
    catch (error) { setCommentError(getApiErrorMessage(error, "Failed to post comment")); }
    finally { setPostingComment(false); }
  }

  async function handleDeleteComment(commentId: string) {
    try { await api.delete(`/photos/comments/${commentId}`); setComments(comments.filter((c) => c.id !== commentId)); }
    catch (error) { setCommentError(getApiErrorMessage(error, "Failed to delete comment")); }
  }

  function closeFeed() {
    setFeedStartIndex(null);
    setActiveCommentPhotoId(null);
    setComments([]);
    setNewComment("");
    setCommentError("");
  }

  function toggleComments(photoId: string) {
    if (activeCommentPhotoId === photoId) {
      setActiveCommentPhotoId(null);
      setComments([]);
      setNewComment("");
      setCommentError("");
    } else {
      setActiveCommentPhotoId(photoId);
      setComments([]);
      setNewComment("");
      setCommentError("");
      loadComments(photoId);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMessage("");
    try {
      await api.put("/users/me", { display_name: displayName, bio });
      await refreshUser();
      setMessage("Profile updated!"); setMessageType("success"); setEditing(false);
      showToast("Profile saved!");
    }
    catch (error: unknown) { setMessage(getApiErrorMessage(error, "Update failed")); setMessageType("error"); }
    finally { setSaving(false); }
  }

  // Keyboard: Escape closes story/feed view
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (storyPartyId) { setStoryPartyId(null); setStoryIndex(0); return; }
        if (feedStartIndex !== null) closeFeed();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [feedStartIndex, storyPartyId]);

  // Auto-advance story
  useEffect(() => {
    if (!storyPartyId) return;
    const currentPhotos = photos.filter((p) => p.party_id === storyPartyId);
    if (currentPhotos.length === 0) return;
    const allPartyIds = [...new Set(photos.filter((p) => p.party_id).map((p) => p.party_id!))];
    const timer = setTimeout(() => {
      if (storyIndex < currentPhotos.length - 1) { setStoryIndex(storyIndex + 1); }
      else {
        const idx = allPartyIds.indexOf(storyPartyId);
        if (idx < allPartyIds.length - 1) { setStoryPartyId(allPartyIds[idx + 1]); setStoryIndex(0); }
        else { setStoryPartyId(null); setStoryIndex(0); }
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [storyPartyId, storyIndex, photos]);

  // Auto-scroll to tapped post when feed opens
  useEffect(() => {
    if (feedStartIndex !== null) {
      requestAnimationFrame(() => {
        feedPhotoRefs.current[feedStartIndex]?.scrollIntoView({ behavior: "instant", block: "start" });
      });
    }
  }, [feedStartIndex]);

  if (!user) return null;

  const ratingVal = Number(user.social_rating);
  const partyPhotos = photos.filter((photo) => photo.party_id);
  const highlightPartyIds = Array.from(new Set(partyPhotos.map((photo) => photo.party_id).filter((partyId): partyId is string => Boolean(partyId))));
  const storyPhotos = storyPartyId ? partyPhotos.filter((photo) => photo.party_id === storyPartyId) : [];

  function storyNext() {
    if (storyIndex < storyPhotos.length - 1) { setStoryIndex(storyIndex + 1); }
    else {
      const idx = highlightPartyIds.indexOf(storyPartyId!);
      if (idx < highlightPartyIds.length - 1) { setStoryPartyId(highlightPartyIds[idx + 1]); setStoryIndex(0); }
      else { setStoryPartyId(null); setStoryIndex(0); }
    }
  }

  function storyPrev() {
    if (storyIndex > 0) { setStoryIndex(storyIndex - 1); }
    else {
      const idx = highlightPartyIds.indexOf(storyPartyId!);
      if (idx > 0) {
        const prevId = highlightPartyIds[idx - 1];
        const prevPhotos = partyPhotos.filter((p) => p.party_id === prevId);
        setStoryPartyId(prevId);
        setStoryIndex(Math.max(0, prevPhotos.length - 1));
      }
    }
  }
  const photoPages = Math.ceil(photosTotal / 36);
  const memberSince = new Date(user.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          >
            <div className={`px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl backdrop-blur-md border ${
              toast.type === "success"
                ? "bg-success/90 text-white border-success/30 shadow-success/20"
                : "bg-error/90 text-white border-error/30 shadow-error/20"
            }`}>
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO BANNER */}
      <div className="profile-hero h-48 sm:h-56 md:h-64">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-24 sm:-mt-28 relative z-10">

        {/* PROFILE HEADER CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="px-5 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7">
            {/* Top section: Avatar + Info */}
            <div className="flex items-start gap-4 sm:gap-5">
              {/* Avatar */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary via-accent to-hot p-[2.5px] shadow-xl shadow-primary/25 rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="w-full h-full rounded-[14px] sm:rounded-[18px] bg-bg overflow-hidden -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    {avatarUploading ? (
                      <div className="w-full h-full flex items-center justify-center bg-surface"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                    ) : user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl text-text font-bold bg-gradient-to-br from-surface to-surface-light">
                        {user.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={triggerAvatarUpload}
                  disabled={avatarUploading}
                  aria-label="Change profile photo"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary-hover transition tap-active opacity-0 group-hover:opacity-100 sm:opacity-100"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input ref={avatarInputRef} type="file" aria-label="Upload avatar image" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl font-extrabold text-text tracking-tight truncate leading-tight">{user.display_name}</h1>
                    <p className="text-text-muted text-xs sm:text-sm mt-0.5">@{user.username}</p>
                  </div>
                  <Link to="/settings" className="btn-secondary-luxe text-[10px] sm:text-xs font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition flex items-center gap-1 shrink-0 tap-active" aria-label="Settings">
                    <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline">Settings</span>
                  </Link>
                </div>

                {user.bio && (
                  <p className="text-text-muted/80 text-xs sm:text-sm mt-2 line-clamp-2 leading-relaxed">{user.bio}</p>
                )}

                <p className="text-text-dim text-[10px] sm:text-xs mt-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Member since {memberSince}
                </p>
              </div>
            </div>

            {/* Edit profile mini form */}
            <AnimatePresence>
              {editing && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleSave}
                  className="mt-5 pt-5 border-t border-primary/[0.06] space-y-4 overflow-hidden"
                >
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.12em] mb-1.5">Display Name</label>
                      <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} placeholder="Your display name" className="input-luxe w-full rounded-xl px-4 py-3 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.12em] mb-1.5">Bio</label>
                      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} maxLength={500} className="input-luxe w-full rounded-xl px-4 py-3 resize-none text-sm" placeholder="Tell people about yourself..." />
                      <p className="text-text-dim text-[10px] mt-1 text-right">{bio.length}/500</p>
                    </div>
                  </div>
                  {message && (
                    <p className={`text-xs ${messageType === "error" ? "text-error bg-error/10 border-error/15" : "text-success bg-success/10 border-success/15"} border px-4 py-2.5 rounded-xl`}>{message}</p>
                  )}
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="btn-primary-luxe font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50 flex items-center gap-2 text-sm flex-1 justify-center tap-active">
                      {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving</> : <><Check className="w-3.5 h-3.5" />Save</>}
                    </button>
                    <button type="button" onClick={() => { setEditing(false); setDisplayName(user.display_name); setBio(user.bio || ""); }}
                      className="btn-secondary-luxe px-5 py-2.5 rounded-xl transition text-sm tap-active">Cancel</button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* STATS ROW */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 mt-5 pt-5 border-t border-primary/[0.06]">
              {[
                { label: "Posts", value: photosTotal, color: "text-text" },
                { label: "Friends", value: friendCount === null ? "\u2026" : friendCount, color: "text-text" },
                { label: "Hosted", value: user.parties_hosted, color: "text-accent" },
                { label: "Joined", value: user.parties_attended, color: "text-primary" },
                { label: "Rating", value: user.total_ratings >= 3 ? ratingVal.toFixed(1) : (user.total_ratings > 0 ? ratingVal.toFixed(1) : "New"), color: user.total_ratings >= 3 ? "text-warning" : "text-text-dim", icon: user.total_ratings >= 3 ? Star : undefined },
              ].map((stat) => (
                <div key={stat.label} className="text-center py-2 rounded-xl hover:bg-primary/[0.03] transition">
                  <div className={`text-base sm:text-lg font-bold ${stat.color} flex items-center justify-center gap-0.5`}>
                    {'icon' in stat && stat.icon && <stat.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />}
                    {stat.value}
                  </div>
                  <div className="text-[8px] sm:text-[10px] text-text-dim uppercase tracking-wider font-bold mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={() => { setEditing(true); setMessage(""); }}
            className="bg-surface-light/80 backdrop-blur-sm border border-primary/[0.08] text-text font-semibold py-3 rounded-2xl hover:border-primary/15 transition text-sm flex items-center justify-center gap-2 tap-active">
            <Edit3 className="w-4 h-4 text-primary" /> Edit Profile
          </button>
          <Link to="/dashboard"
            className="bg-surface-light/80 backdrop-blur-sm border border-primary/[0.08] text-text font-semibold py-3 rounded-2xl hover:border-primary/15 transition text-sm flex items-center justify-center gap-2 tap-active">
            <LayoutDashboard className="w-4 h-4 text-accent" /> Dashboard
          </Link>
        </div>

        {/* TAB BAR */}
        <div className="flex border-b border-primary/[0.06] mt-5">
          {([
            { key: "photos" as const, icon: Grid3x3, label: "Posts" },
            { key: "ratings" as const, icon: Award, label: "Reviews" },
            { key: "friends" as const, icon: Users, label: "Friends" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 transition flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider tap-active relative ${
                tab === t.key
                  ? "text-text"
                  : "text-text-dim hover:text-text"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {tab === t.key && (
                <motion.div layoutId="profile-tab-indicator" className="absolute bottom-0 left-[20%] right-[20%] h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div className="mt-4">

          {/* PHOTOS TAB */}
          {tab === "photos" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {/* Event Highlights */}
              {highlightPartyIds.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-bold mb-3 flex items-center gap-1.5">
                    <PartyPopper className="w-3 h-3" /> Highlights
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth-x">
                    {highlightPartyIds.map((partyId) => {
                      const eventPhotos = partyPhotos.filter((photo) => photo.party_id === partyId);
                      const cover = eventPhotos[0];
                      const isActive = storyPartyId === partyId;
                      return (
                        <button key={partyId} onClick={() => { setStoryPartyId(partyId); setStoryIndex(0); }}
                          className="shrink-0 flex flex-col items-center gap-1.5 group tap-active" title={partyTitles[partyId] || "Event"}>
                          <div className={`p-[2.5px] rounded-full transition-all duration-300 ${isActive ? "bg-gradient-to-br from-primary via-warning to-accent shadow-lg shadow-primary/20 scale-105" : "bg-text-dim/20 group-hover:bg-primary/40"}`}>
                            <div className="w-16 h-16 rounded-full overflow-hidden border-[3px] border-bg bg-surface">
                              {cover ? <img src={cover.image_url} alt={partyTitles[partyId] || "Event"} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-text-dim"><PartyPopper className="w-5 h-5" /></div>}
                            </div>
                          </div>
                          <span className="text-[10px] text-text-dim max-w-[72px] truncate text-center font-medium">{partyTitles[partyId] || "Event"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload bar */}
              <div className="glass-panel rounded-2xl p-3 mb-4 flex items-center gap-2">
                <input type="text" aria-label="Photo caption" placeholder="Write a caption\u2026" value={caption} onChange={(e) => setCaption(e.target.value)} className="input-luxe flex-1 rounded-xl px-3 py-2.5 text-sm min-w-0" />
                <input ref={photoInputRef} type="file" aria-label="Upload profile photo" title="Upload profile photo" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} className="hidden" />
                <button onClick={triggerPhotoUpload} disabled={uploading}
                  className="btn-primary-luxe text-sm font-bold px-3.5 py-2.5 rounded-xl transition disabled:opacity-50 shrink-0 flex items-center gap-1.5 tap-active">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                  <span className="hidden sm:inline">{uploading ? "\u2026" : "Post"}</span>
                </button>
              </div>

              {/* Photo grid */}
              {photosLoading ? (
                <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="aspect-square shimmer" />
                  ))}
                </div>
              ) : photos.length === 0 ? (
                <div className="text-center py-16 glass-panel rounded-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-surface-light mx-auto mb-3 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-text-dim/30" />
                  </div>
                  <p className="text-text-dim font-semibold">No posts yet</p>
                  <p className="text-text-dim/60 text-sm mt-1 mb-4">Share your best moments</p>
                  <button onClick={triggerPhotoUpload} className="btn-primary-luxe text-sm font-bold px-5 py-2.5 rounded-xl tap-active inline-flex items-center gap-2">
                    <ImagePlus className="w-4 h-4" /> Upload Photo
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-[2px] sm:gap-1 rounded-xl overflow-hidden">
                    {photos.map((photo, idx) => (
                      <div key={photo.id} className="aspect-square bg-surface overflow-hidden cursor-pointer group relative tap-active"
                        onClick={() => setFeedStartIndex(idx)}>
                        <img src={photo.image_url} alt={photo.caption || "Photo"} className="w-full h-full object-cover transition group-hover:scale-105 duration-300" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex gap-4">
                            <span className="text-white text-sm font-bold flex items-center gap-1"><Heart className="w-4 h-4 fill-white" /> {photo.like_count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {photoPages > 1 && (
                    <div className="flex justify-center items-center gap-3 mt-6">
                      <button onClick={() => setPhotosPage((p) => Math.max(1, p - 1))} disabled={photosPage === 1} className="btn-secondary-luxe p-2.5 rounded-xl disabled:opacity-30 tap-active" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                      <span className="text-text-muted text-sm font-semibold tabular-nums">{photosPage} / {photoPages}</span>
                      <button onClick={() => setPhotosPage((p) => Math.min(photoPages, p + 1))} disabled={photosPage === photoPages} className="btn-secondary-luxe p-2.5 rounded-xl disabled:opacity-30 tap-active" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* RATINGS TAB */}
          {tab === "ratings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {/* Rating summary card */}
              {ratings.length > 0 && (
                <div className="glass-panel rounded-2xl p-5 mb-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-warning/10 border border-warning/15 flex items-center justify-center shrink-0">
                    <Star className="w-7 h-7 text-warning fill-current" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-warning">{ratingVal.toFixed(1)}<span className="text-text-dim text-sm font-semibold">/5</span></div>
                    <p className="text-text-dim text-xs">{ratings.length} review{ratings.length !== 1 ? "s" : ""} from party attendees</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.round(ratingVal) ? "text-warning fill-current" : "text-text-dim/20"}`} />
                    ))}
                  </div>
                </div>
              )}

              {ratingsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass-panel rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full shimmer" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 shimmer rounded-lg w-28" />
                          <div className="h-3 shimmer rounded-lg w-20" />
                          <div className="h-3 shimmer rounded-lg w-3/4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : ratings.length === 0 ? (
                <div className="text-center py-16 glass-panel rounded-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-surface-light mx-auto mb-3 flex items-center justify-center">
                    <Star className="w-7 h-7 text-text-dim/30" />
                  </div>
                  <p className="text-text-dim font-semibold">No reviews yet</p>
                  <p className="text-text-dim/60 text-sm mt-1">Attend parties to receive ratings</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ratings.map((r, i) => (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.25) }} className="glass-panel rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <Link to={`/profile/${r.rater_id}`} className="shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warning to-hot p-[1.5px]">
                            <div className="w-full h-full rounded-full bg-bg flex items-center justify-center text-sm font-bold text-text overflow-hidden">
                              {r.rater_avatar_url ? <img src={r.rater_avatar_url} alt={r.rater_display_name || ""} className="w-full h-full object-cover" /> : (r.rater_display_name || "?").charAt(0).toUpperCase()}
                            </div>
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link to={`/profile/${r.rater_id}`} className="text-text font-bold text-sm hover:text-primary transition">{r.rater_display_name}</Link>
                            <span className="text-text-dim text-[10px] ml-auto shrink-0">{timeAgo(r.created_at)}</span>
                          </div>
                          <div className="flex gap-0.5 mb-1.5">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < r.score ? "text-warning fill-current" : "text-text-dim/20"}`} />
                            ))}
                          </div>
                          {r.comment && <p className="text-text-muted text-xs leading-relaxed">{r.comment}</p>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* FRIENDS TAB */}
          {tab === "friends" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {/* Pending requests */}
              {(pendingLoading || pendingRequests.length > 0) && (
                <div className="mb-5">
                  <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                    {pendingLoading ? "Loading\u2026" : `Pending Requests (${pendingRequests.length})`}
                  </h3>
                  {!pendingLoading && (
                    <div className="space-y-2">
                      {pendingRequests.map((req) => (
                        <motion.div key={req.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
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
                            <button onClick={() => handleAcceptFriend(req.id)} disabled={pendingActionId === req.id}
                              className="bg-primary/15 hover:bg-primary/25 text-primary font-bold text-xs px-3 py-2 rounded-xl transition disabled:opacity-50 tap-active">Accept</button>
                            <button onClick={() => handleDeclineFriend(req.id)} disabled={pendingActionId === req.id}
                              className="bg-text-dim/10 text-text-muted font-semibold text-xs px-3 py-2 rounded-xl transition disabled:opacity-50 tap-active">Decline</button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Friends list */}
              {friendsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full shimmer" />
                      <div className="flex-1 space-y-2"><div className="h-3.5 shimmer rounded-lg w-24" /><div className="h-3 shimmer rounded-lg w-16" /></div>
                    </div>
                  ))}
                </div>
              ) : friends.length === 0 && pendingRequests.length === 0 ? (
                <div className="text-center py-16 glass-panel rounded-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-surface-light mx-auto mb-3 flex items-center justify-center">
                    <Users className="w-7 h-7 text-text-dim/30" />
                  </div>
                  <p className="text-text-dim font-semibold">No friends yet</p>
                  <p className="text-text-dim/60 text-sm mt-1 mb-4">Discover people at parties</p>
                  <Link to="/parties" className="btn-primary-luxe text-sm font-bold px-5 py-2.5 rounded-xl tap-active inline-flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Find Friends
                  </Link>
                </div>
              ) : friends.length > 0 ? (
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
                      <button onClick={() => handleUnfriend(f.id)} className="text-text-dim hover:text-error text-xs p-2.5 rounded-xl transition shrink-0 tap-active hover:bg-error/10" title="Remove friend" aria-label={`Remove ${f.display_name} as friend`}>
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : null}
            </motion.div>
          )}
        </div>
      </div>

      {/* INSTAGRAM-STYLE SCROLLABLE FEED */}
      <AnimatePresence>
        {feedStartIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-bg z-50 flex flex-col"
          >
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur-lg border-b border-primary/[0.06] px-4 py-3 flex items-center gap-3">
              <button onClick={closeFeed} className="w-9 h-9 rounded-full bg-surface-light flex items-center justify-center text-text hover:bg-surface transition tap-active" aria-label="Back to grid">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="font-bold text-text text-sm">Posts</h2>
            </div>

            {/* Snap-scroll feed */}
            <div ref={feedContainerRef} className="flex-1 overflow-y-auto snap-feed">
              <div className="max-w-lg mx-auto">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    ref={(el) => { feedPhotoRefs.current[idx] = el; }}
                    className="border-b border-primary/[0.06] snap-feed-item"
                  >
                    {/* Post header */}
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px] shrink-0">
                        <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-sm font-bold text-text">
                          {user?.avatar_url
                            ? <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                            : (user?.display_name || "?").charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text text-sm font-bold truncate">{user?.display_name}</p>
                      </div>
                      <button onClick={() => handleDeletePhoto(photo.id)} className="text-text-dim hover:text-error transition p-2 rounded-lg hover:bg-error/10 tap-active" aria-label="Delete photo">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Image */}
                    <div className="w-full bg-black">
                      <img src={photo.image_url} alt={photo.caption || "Photo"} className="w-full max-h-[70vh] object-contain" loading={idx > 2 ? "lazy" : undefined} />
                    </div>

                    {/* Instagram-style actions & info */}
                    <div className="px-4 pt-3 pb-3">
                      <div className="flex items-center gap-4 mb-2">
                        <button className="tap-active" aria-label="Like">
                          <Heart className="w-6 h-6 text-text hover:text-hot transition" />
                        </button>
                        <button onClick={() => toggleComments(photo.id)} className="tap-active" aria-label="Comment">
                          <MessageCircle className="w-6 h-6 text-text hover:text-primary transition" />
                        </button>
                      </div>
                      <p className="text-text text-sm font-bold">{photo.like_count.toLocaleString()} {photo.like_count === 1 ? "like" : "likes"}</p>
                      {photo.caption && (
                        <p className="text-text text-sm mt-1">
                          <span className="font-bold">{user?.display_name}</span>{" "}
                          <span className="text-text-muted">{photo.caption}</span>
                        </p>
                      )}
                      <button onClick={() => toggleComments(photo.id)} className="text-text-dim text-sm mt-1 hover:text-text-muted transition block">
                        View all comments
                      </button>
                      <button onClick={() => toggleComments(photo.id)} className="flex items-center gap-2.5 mt-2 w-full tap-active">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent p-[1px] shrink-0">
                          <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-[8px] font-bold text-text">
                            {user?.avatar_url
                              ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                              : (user?.display_name || "?").charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <span className="text-text-dim text-sm">Add a comment…</span>
                      </button>
                      <p className="text-text-dim text-[10px] uppercase mt-2">
                        {new Date(photo.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMMENTS BOTTOM SHEET */}
      <AnimatePresence>
        {activeCommentPhotoId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => { setActiveCommentPhotoId(null); setComments([]); setNewComment(""); setCommentError(""); }} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-h-[75vh] bg-bg rounded-t-3xl flex flex-col shadow-2xl border-t border-primary/[0.08]"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-text-dim/30" />
              </div>
              <div className="px-4 pb-3 border-b border-primary/[0.06] flex items-center justify-between">
                <h3 className="font-bold text-text text-base">Comments</h3>
                <button onClick={() => { setActiveCommentPhotoId(null); setComments([]); setNewComment(""); setCommentError(""); }} className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-text-dim hover:text-text transition tap-active" aria-label="Close comments">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[200px]">
                {commentError && <div className="text-error text-xs bg-error/10 px-3 py-2 rounded-xl mb-3">{commentError}</div>}
                {loadingComments ? (
                  <div className="flex items-center justify-center gap-2 py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /><span className="text-text-muted text-sm">Loading…</span></div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-text font-bold text-lg mb-1">No comments yet</p>
                    <p className="text-text-dim text-sm">Start the conversation.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent p-[1px] shrink-0">
                          <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-[10px] font-bold text-text">
                            {comment.avatar_url ? <img src={comment.avatar_url} alt="" className="w-full h-full object-cover" /> : (comment.display_name || "?").charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">
                            <span className="text-text font-bold mr-1.5">{comment.display_name || comment.username || "User"}</span>
                            <span className="text-text-muted">{comment.comment_text}</span>
                          </p>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-text-dim">
                            <span>{timeAgo(comment.created_at)}</span>
                            {comment.like_count > 0 && <span>{comment.like_count} {comment.like_count === 1 ? "like" : "likes"}</span>}
                            {user && user.id === comment.user_id && <button onClick={() => handleDeleteComment(comment.id)} className="text-error hover:text-error/80 transition font-medium">Delete</button>}
                          </div>
                        </div>
                        <div className="shrink-0 pt-1">
                          <Heart className="w-3 h-3 text-text-dim/40" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-primary/[0.06] shrink-0 bg-bg rounded-b-3xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent p-[1px] shrink-0">
                    <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-[10px] font-bold text-text">
                      {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : (user?.display_name || "?").charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <input type="text" aria-label="Add a comment" placeholder="Add a comment…" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && newComment.trim()) handleAddComment(); }} disabled={postingComment} className="flex-1 bg-transparent text-text text-sm placeholder:text-text-dim outline-none min-w-0 py-2" />
                  <button onClick={handleAddComment} disabled={postingComment || !newComment.trim()} className="text-primary font-bold text-sm disabled:opacity-40 transition tap-active shrink-0" aria-label="Post comment">
                    {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INSTAGRAM-STYLE STORY VIEWER */}
      <AnimatePresence>
        {storyPartyId && storyPhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[70] flex flex-col"
          >
            {/* Progress bars */}
            <div className="absolute top-0 left-0 right-0 z-20 px-2 pt-2 flex gap-1">
              {storyPhotos.map((_, i) => (
                <div key={i} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
                  {i < storyIndex ? (
                    <div className="h-full bg-white rounded-full w-full" />
                  ) : i === storyIndex ? (
                    <div key={`sp-${storyPartyId}-${storyIndex}`} className="h-full bg-white rounded-full story-progress-bar" />
                  ) : null}
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-5 left-0 right-0 z-20 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px]">
                  <div className="w-full h-full rounded-full bg-black overflow-hidden flex items-center justify-center text-sm font-bold text-white">
                    {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : (user?.display_name || "?").charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <p className="text-white text-sm font-bold">{partyTitles[storyPartyId] || "Event"}</p>
                  <p className="text-white/60 text-[10px]">{storyPhotos[storyIndex]?.created_at ? timeAgo(storyPhotos[storyIndex].created_at) : ""}</p>
                </div>
              </div>
              <button onClick={() => { setStoryPartyId(null); setStoryIndex(0); }} className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white transition rounded-full" aria-label="Close story">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Story image + tap zones */}
            <div className="flex-1 flex items-center justify-center relative select-none">
              <img
                src={storyPhotos[storyIndex]?.image_url}
                alt={storyPhotos[storyIndex]?.caption || "Story"}
                className="max-w-full max-h-full object-contain"
                draggable={false}
              />
              <div className="absolute inset-0 flex">
                <button className="w-1/3 h-full cursor-default" onClick={storyPrev} aria-label="Previous" />
                <div className="w-1/3 h-full" />
                <button className="w-1/3 h-full cursor-default" onClick={storyNext} aria-label="Next" />
              </div>
            </div>

            {/* Caption overlay */}
            {storyPhotos[storyIndex]?.caption && (
              <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-12 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm">{storyPhotos[storyIndex].caption}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
