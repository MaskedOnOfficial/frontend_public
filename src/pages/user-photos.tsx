import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import PhotoGrid from "../components/photo-grid";
import type { Photo } from "../types";
import { getApiErrorMessage } from "../lib/errors";

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

  const loadUserInfo = useCallback(async () => {
    if (isOwnProfile) {
      setDisplayName(user?.display_name || "My");
      return;
    }
    try {
      const res = await api.get(`/users/${resolvedUserId}`);
      setDisplayName(res.data.data.user.display_name);
    } catch (loadError) {
      console.error("Failed to load profile info:", getApiErrorMessage(loadError, "Unknown profile info error"));
    }
  }, [isOwnProfile, resolvedUserId, user?.display_name]);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await api.get(`/users/${resolvedUserId}/photos?page=${page}&limit=20`);
      setPhotos(res.data.data.photos);
      setTotal(res.data.data.total);
    } catch (loadError) {
      console.error("Failed to load user photos:", getApiErrorMessage(loadError, "Unknown user photos error"));
      setError("Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, [page, resolvedUserId]);

  useEffect(() => {
    if (resolvedUserId) {
      loadPhotos();
      loadUserInfo();
    }
  }, [loadPhotos, loadUserInfo, resolvedUserId]);

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
    } catch (uploadError: unknown) {
      setError(getApiErrorMessage(uploadError, "Upload failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLike(photoId: string) {
    try {
      await api.post(`/photos/${photoId}/like`);
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, like_count: p.like_count + 1 } : p)),
      );
    } catch (likeError) {
      console.error("Failed to like photo, attempting unlike:", getApiErrorMessage(likeError, "Unknown like error"));
      try {
        await api.delete(`/photos/${photoId}/like`);
        setPhotos((prev) =>
          prev.map((p) => (p.id === photoId ? { ...p, like_count: Math.max(0, p.like_count - 1) } : p)),
        );
      } catch (unlikeError) {
        console.error("Failed to unlike photo:", getApiErrorMessage(unlikeError, "Unknown unlike error"));
      }
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

  const totalPages = Math.ceil(total / 20);

  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="glass-panel rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-2">Media Portfolio</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-text">
              {isOwnProfile ? "My Photos" : `${displayName}'s Photos`}
            </h1>
          </div>
          <p className="text-text-muted text-sm">{total} photo{total !== 1 ? "s" : ""}</p>
        </div>

        {error && <p className="text-error text-sm mb-4 bg-error/10 px-4 py-2 rounded">{error}</p>}

        {isOwnProfile && (
          <div className="glass-panel rounded-2xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  aria-label="Photo caption"
                  placeholder="Add a caption to your memory..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="input-luxe w-full rounded-lg px-4 py-2.5 text-sm"
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                aria-label="Upload user photo"
                title="Upload user photo"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-primary-luxe text-sm font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload Photo"}
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
          <div className="flex justify-center gap-2 mt-6 flex-wrap">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1 rounded text-sm transition rounded-lg ${
                  p === page ? "btn-primary-luxe" : "btn-secondary-luxe"
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
