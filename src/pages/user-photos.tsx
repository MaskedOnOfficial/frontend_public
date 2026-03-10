import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-context";
import PhotoGrid from "../components/photo-grid";
import type { Photo } from "../types";

export default function UserPhotosPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("");

  const isOwnProfile = userId === "me" || userId === user?.id;
  const resolvedUserId = isOwnProfile ? user?.id : userId;

  useEffect(() => {
    if (resolvedUserId) {
      loadPhotos();
      loadUserInfo();
    }
  }, [resolvedUserId, page]);

  async function loadUserInfo() {
    if (isOwnProfile) {
      setDisplayName(user?.display_name || "My");
    } else {
      try {
        const res = await api.get(`/users/${resolvedUserId}`);
        setDisplayName(res.data.data.user.display_name);
      } catch {}
    }
  }

  async function loadPhotos() {
    try {
      const res = await api.get(`/users/${resolvedUserId}/photos?page=${page}&limit=20`);
      setPhotos(res.data.data.photos);
      setTotal(res.data.data.total);
    } catch {
      setError("Failed to load photos");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (caption.trim()) formData.append("caption", caption.trim());

      await api.post("/photos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCaption("");
      loadPhotos();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLike(photoId: string) {
    try {
      await api.post(`/photos/${photoId}/like`);
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, like_count: p.like_count + 1 } : p))
      );
    } catch {
      try {
        await api.delete(`/photos/${photoId}/like`);
        setPhotos((prev) =>
          prev.map((p) => (p.id === photoId ? { ...p, like_count: Math.max(0, p.like_count - 1) } : p))
        );
      } catch {}
    }
  }

  async function handleDelete(photoId: string) {
    try {
      await api.delete(`/photos/${photoId}`);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setTotal((t) => t - 1);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Delete failed");
    }
  }

  const totalPages = Math.ceil(total / 20);

  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-text mb-1">
          {isOwnProfile ? "My Photos" : `${displayName}'s Photos`}
        </h1>
        <p className="text-text-muted text-sm mb-6">{total} photo{total !== 1 ? "s" : ""}</p>

        {error && <p className="text-error text-sm mb-4 bg-error/10 px-4 py-2 rounded">{error}</p>}

        {/* Upload area (own profile only) */}
        {isOwnProfile && (
          <div className="bg-surface rounded-xl border border-text-muted/10 p-4 mb-6">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-bg border border-text-muted/20 text-text rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-5 py-2 rounded-lg transition disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "📷 Upload"}
              </button>
            </div>
          </div>
        )}

        <PhotoGrid
          photos={photos}
          onLike={handleLike}
          onDelete={isOwnProfile ? handleDelete : undefined}
          currentUserId={user?.id}
        />

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1 rounded text-sm transition ${
                  p === page
                    ? "bg-primary text-white"
                    : "bg-surface text-text-muted hover:bg-surface-light"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
