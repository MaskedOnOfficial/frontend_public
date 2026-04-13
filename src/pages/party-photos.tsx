import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import PhotoGrid from "../components/photo-grid";
import type { Party, Photo, Attendee } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Upload, Loader2, Star, ChevronLeft, ChevronRight } from "lucide-react";

export default function PartyPhotosPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [party, setParty] = useState<Party | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");

  const loadParty = useCallback(async () => {
    try {
      const [partyRes, attendeesRes] = await Promise.all([
        api.get(`/parties/${partyId}`),
        api.get(`/parties/${partyId}/attendees`),
      ]);
      setParty(partyRes.data.data.party);
      setAttendees(attendeesRes.data.data.attendees);
    } catch (loadError) {
      console.error("Failed to load party details:", getApiErrorMessage(loadError, "Unknown party details error"));
      setError("Party not found");
    }
  }, [partyId]);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await api.get(`/parties/${partyId}/photos?page=${page}&limit=20`);
      setPhotos(res.data.data.photos);
      setTotal(res.data.data.total);
    } catch (loadError) {
      console.error("Failed to load party photos:", getApiErrorMessage(loadError, "Unknown party photos error"));
      setError("Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, [page, partyId]);

  useEffect(() => { if (partyId) loadParty(); }, [loadParty, partyId]);
  useEffect(() => { if (partyId) loadPhotos(); }, [loadPhotos, partyId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("party_id", partyId!);
      if (caption.trim()) formData.append("caption", caption.trim());
      await api.post("/photos", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setCaption("");
      loadPhotos();
    } catch (uploadError: unknown) {
      setError(getApiErrorMessage(uploadError, "Upload failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const likeInFlightRef = useRef<Set<string>>(new Set());
  async function handleLike(photoId: string) {
    if (likeInFlightRef.current.has(photoId)) return;
    likeInFlightRef.current.add(photoId);
    try {
      await api.post(`/photos/${photoId}/like`);
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, like_count: p.like_count + 1 } : p)));
    } catch (likeError) {
      console.error("Failed to like photo, attempting unlike:", getApiErrorMessage(likeError, "Unknown like error"));
      try {
        await api.delete(`/photos/${photoId}/like`);
        setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, like_count: Math.max(0, p.like_count - 1) } : p)));
      } catch (unlikeError) {
        console.error("Failed to unlike photo:", getApiErrorMessage(unlikeError, "Unknown unlike error"));
      }
    } finally {
      likeInFlightRef.current.delete(photoId);
    }
  }

  async function handleDelete(photoId: string) {
    try {
      await api.delete(`/photos/${photoId}`);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setTotal((count) => count - 1);
    } catch (deleteError: unknown) {
      setError(getApiErrorMessage(deleteError, "Delete failed"));
    }
  }

  const isHost = party && user && party.host_id === user.id;
  const isAttendee = user && attendees.some((a) => a.user_id === user.id);
  const canUpload = user && (isHost || isAttendee);
  const totalPages = Math.ceil(total / 20);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-6 md:py-8 px-4 pb-28 md:pb-12">
      <div className="max-w-6xl mx-auto">
        <Link to={`/parties/${partyId}`} className="text-text-muted text-sm hover:text-text transition mb-4 inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to party
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-accent/20">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">Visual Archive</p>
              <h1 className="text-2xl font-bold text-text tracking-tight">Party Gallery</h1>
              {party && <p className="text-text-muted text-sm">{party.title}</p>}
            </div>
          </div>
          <span className="text-text-muted text-sm font-semibold">{total} photo{total !== 1 ? "s" : ""}</span>
        </motion.div>

        {error && <p className="text-error text-sm mb-4 bg-error/10 border border-error/20 px-4 py-3 rounded-xl">{error}</p>}

        {/* Featured Cover Image */}
        {party?.cover_image_url && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-warning" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-warning">Featured</span>
            </div>
            <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
              <img src={party.cover_image_url} alt={`${party.title} cover`} className="w-full h-72 sm:h-96 object-cover group-hover:scale-105 transition duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-bg/60 via-bg/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white font-bold text-lg">Event Cover Image</p>
                <p className="text-white/70 text-sm">Set by the host</p>
              </div>
            </div>
          </div>
        )}

        {canUpload && (
          <div className="glass-panel rounded-2xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <input
                type="text"
                aria-label="Photo caption"
                placeholder="Write a memory caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="input-luxe flex-1 rounded-xl px-4 py-3 text-sm"
              />
              <input ref={fileInputRef} type="file" aria-label="Upload party photo" title="Upload party photo" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-primary-luxe text-sm font-bold px-5 py-3 rounded-xl transition disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />Upload Photo</>}
              </button>
            </div>
          </div>
        )}

        <PhotoGrid photos={photos} onLike={handleLike} onDelete={handleDelete} currentUserId={user?.id} />

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <button aria-label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary-luxe p-2.5 rounded-xl disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-text-muted text-sm font-semibold">{page} / {totalPages}</span>
            <button aria-label="Next page" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary-luxe p-2.5 rounded-xl disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
