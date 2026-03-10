import { useState } from "react";
import type { Photo } from "../types";

interface PhotoGridProps {
  photos: Photo[];
  onLike?: (photoId: string) => void;
  onDelete?: (photoId: string) => void;
  currentUserId?: string;
}

export default function PhotoGrid({ photos, onLike, onDelete, currentUserId }: PhotoGridProps) {
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        No photos yet
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => setLightbox(photo)}
          >
            <img
              src={photo.image_url}
              alt={photo.caption || "Party photo"}
              className="w-full h-full object-cover transition group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-end">
              <div className="p-2 opacity-0 group-hover:opacity-100 transition text-white text-xs">
                ❤️ {photo.like_count}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-w-3xl w-full bg-surface rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.image_url}
              alt={lightbox.caption || "Photo"}
              className="w-full max-h-[70vh] object-contain bg-black"
            />
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {lightbox.display_name && (
                    <>
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
                        {lightbox.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-text text-sm font-semibold">{lightbox.display_name}</span>
                        {lightbox.username && (
                          <span className="text-text-muted text-xs ml-2">@{lightbox.username}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {onLike && (
                    <button
                      onClick={() => onLike(lightbox.id)}
                      className="text-primary hover:text-primary-hover transition text-sm"
                    >
                      ❤️ {lightbox.like_count}
                    </button>
                  )}
                  {onDelete && currentUserId === lightbox.user_id && (
                    <button
                      onClick={() => { onDelete(lightbox.id); setLightbox(null); }}
                      className="text-error hover:text-error/80 transition text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              {lightbox.caption && (
                <p className="text-text-muted text-sm">{lightbox.caption}</p>
              )}
              <p className="text-text-muted/50 text-xs mt-2">
                {new Date(lightbox.created_at).toLocaleDateString("en-IN", {
                  year: "numeric", month: "short", day: "numeric",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-3xl hover:text-text-muted transition"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
