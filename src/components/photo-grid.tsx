import { useState } from "react";
import api from "../lib/api";
import type { Photo } from "../types";
import { getApiErrorMessage } from "../lib/errors";

interface PhotoGridProps {
  photos: Photo[];
  onLike?: (photoId: string) => void;
  onDelete?: (photoId: string) => void;
  currentUserId?: string;
  commentCounts?: Record<string, number>;
}

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  like_count: number;
  created_at: string;
  display_name?: string;
  username?: string;
  avatar_url?: string | null;
}

export default function PhotoGrid({ photos, onLike, onDelete, currentUserId, commentCounts }: PhotoGridProps) {
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

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

  function handleOpenLightbox(photo: Photo) {
    setLightbox(photo);
    setComments([]);
    setNewComment("");
    setCommentError("");
    loadComments(photo.id);
  }

  function handleCloseLightbox() {
    setLightbox(null);
    setComments([]);
    setNewComment("");
    setCommentError("");
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
            onClick={() => handleOpenLightbox(photo)}
          >
            <img
              src={photo.image_url}
              alt={photo.caption || "Party photo"}
              className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center">
              <div className="text-white text-4xl flex gap-6 mb-6">
                <div className="flex flex-col items-center hover:scale-110 transition cursor-pointer">
                  <span>💬</span>
                  {commentCounts && commentCounts[photo.id] ? (
                    <span className="text-xs mt-1">{commentCounts[photo.id]}</span>
                  ) : null}
                </div>
                <div className="flex flex-col items-center hover:scale-110 transition cursor-pointer">
                  <span>❤️</span>
                  <span className="text-xs mt-1">{photo.like_count}</span>
                </div>
              </div>
              {photo.caption && (
                <p className="text-white text-xs text-center px-2 max-w-xs truncate bg-black/30 px-3 py-1 rounded-full">
                  {photo.caption}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => handleCloseLightbox()}
        >
          <div
            className="max-w-4xl w-full my-auto glass-panel rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
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
                    {lightbox.display_name && (
                      <>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {lightbox.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-text text-sm font-semibold truncate">{lightbox.display_name}</p>
                          {lightbox.username && <p className="text-text-muted text-xs">@{lightbox.username}</p>}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {onLike && (
                      <button onClick={() => onLike(lightbox.id)} className="text-accent hover:text-accent-hover transition text-sm font-semibold">
                        ❤️ {lightbox.like_count}
                      </button>
                    )}
                    {onDelete && currentUserId === lightbox.user_id && (
                      <button
                        onClick={() => {
                          onDelete(lightbox.id);
                          handleCloseLightbox();
                        }}
                        className="text-error hover:text-error/80 transition text-sm"
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>
                {lightbox.caption && (
                  <p className="text-text text-sm mb-2">
                    <span className="font-semibold">{lightbox.display_name}:</span> {lightbox.caption}
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
                            {currentUserId === comment.user_id && (
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
            onClick={() => handleCloseLightbox()}
            className="absolute top-4 right-4 text-white text-3xl hover:text-text-muted transition"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
