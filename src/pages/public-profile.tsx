import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-context";
import type { User, Photo, Rating } from "../types";

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

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"photos" | "ratings">("photos");

  // Photos
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosTotal, setPhotosTotal] = useState(0);
  const [photosPage, setPhotosPage] = useState(1);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  // Ratings
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  useEffect(() => {
    if (userId) loadProfile();
  }, [userId]);

  useEffect(() => {
    if (userId) loadPhotos();
  }, [userId, photosPage]);

  useEffect(() => {
    if (userId && tab === "ratings") loadRatings();
  }, [userId, tab]);

  async function loadProfile() {
    try {
      const res = await api.get(`/users/${userId}`);
      setProfile(res.data.data.user);
    } catch {} finally { setLoading(false); }
  }

  async function loadPhotos() {
    try {
      const res = await api.get(`/users/${userId}/photos?page=${photosPage}&limit=12`);
      setPhotos(res.data.data.photos);
      setPhotosTotal(res.data.data.total);
    } catch {}
  }

  async function loadRatings() {
    try {
      const res = await api.get(`/users/${userId}/ratings`);
      setRatings(res.data.data.ratings);
    } catch {} finally { setRatingsLoading(false); }
  }

  async function handleLike(photoId: string) {
    try {
      await api.post(`/photos/${photoId}/like`);
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, like_count: p.like_count + 1 } : p))
      );
    } catch {}
  }

  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted">Loading...</div>;
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

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero banner */}
      <div className="h-48 bg-gradient-to-br from-accent via-primary/40 to-accent/60 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(83,52,131,0.4),transparent_60%)]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10 pb-12">
        {/* Profile header card */}
        <div className="bg-surface rounded-2xl border border-text-muted/10 shadow-2xl shadow-black/30 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
              {/* Avatar */}
              <div className="relative -mt-20 sm:-mt-24 flex-shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-surface overflow-hidden bg-accent shadow-lg">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl text-white font-bold">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Name & info */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-text">{profile.display_name}</h1>
                <p className="text-text-muted text-sm">@{profile.username}</p>
                {profile.bio && (
                  <p className="text-text-muted/80 text-sm mt-2 max-w-md">{profile.bio}</p>
                )}
              </div>

              {/* Rating badge */}
              <div className="flex-shrink-0 text-center">
                {profile.total_ratings >= 3 ? (
                  <div className="bg-warning/10 border border-warning/20 rounded-xl px-5 py-3">
                    <div className="text-2xl font-bold text-warning">{ratingVal.toFixed(1)}</div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider">{profile.total_ratings} ratings</div>
                  </div>
                ) : (
                  <div className="bg-surface-light rounded-xl px-5 py-3">
                    <div className="text-sm text-text-muted">No rating yet</div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats strip */}
            <div className="flex items-center justify-center sm:justify-start gap-8 mt-6 pt-6 border-t border-text-muted/10">
              <div className="text-center">
                <div className="text-xl font-bold text-text">{profile.parties_hosted}</div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Hosted</div>
              </div>
              <div className="w-px h-8 bg-text-muted/10" />
              <div className="text-center">
                <div className="text-xl font-bold text-text">{profile.parties_attended}</div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Attended</div>
              </div>
              <div className="w-px h-8 bg-text-muted/10" />
              <div className="text-center">
                <div className="text-xl font-bold text-text">{photosTotal}</div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Photos</div>
              </div>
              <div className="w-px h-8 bg-text-muted/10" />
              <div className="text-center">
                <div className="text-xl font-bold text-text">{profile.total_ratings}</div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Reviews</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-6 bg-surface rounded-xl p-1 border border-text-muted/10">
          {(["photos", "ratings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition ${
                tab === t
                  ? "bg-primary text-white shadow"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {t === "photos" ? `📷 Photos (${photosTotal})` : `⭐ Ratings (${profile.total_ratings})`}
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
                  <p className="text-text-muted text-lg">No ratings yet</p>
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
