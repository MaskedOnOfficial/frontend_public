import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import type { Photo } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { useBackButton } from "../lib/use-back-button";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Trash2, X, Loader2, Send } from "lucide-react";

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
      const res = await api.post(`/photos/${lightbox.id}/comments`, { comment_text: newComment.trim() });
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

  // Android back button closes lightbox
  useBackButton(!!lightbox, useCallback(() => { setLightbox(null); setComments([]); setNewComment(""); setCommentError(""); }, []));

  // Keyboard navigation for lightbox
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && lightbox) handleCloseLightbox();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [lightbox]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo, i) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.03, 0.25) }}
            className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group bg-surface"
            onClick={() => handleOpenLightbox(photo)}
          >
            <img
              src={photo.image_url}
              alt={photo.caption || "Party photo"}
              className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-bg/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center">
              <div className="flex gap-5 mb-3">
                <div className="flex flex-col items-center">
                  <Heart className="w-6 h-6 text-hot" />
                  <span className="text-white text-xs font-semibold mt-1">{photo.like_count}</span>
                </div>
                {commentCounts && commentCounts[photo.id] != null && (
                  <div className="flex flex-col items-center">
                    <MessageCircle className="w-6 h-6 text-primary" />
                    <span className="text-white text-xs font-semibold mt-1">{commentCounts[photo.id]}</span>
                  </div>
                )}
              </div>
              {photo.caption && (
                <p className="text-white/80 text-xs text-center max-w-[90%] truncate bg-bg/40 px-3 py-1 rounded-full">
                  {photo.caption}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-bg/95 backdrop-blur-lg z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => handleCloseLightbox()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-4xl w-full my-auto glass-panel rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image */}
              <div className="shrink-0 bg-black relative">
                <img
                  src={lightbox.image_url}
                  alt={lightbox.caption || "Photo"}
                  className="w-full max-h-[60vh] object-contain"
                />
              </div>

              {/* Info & Comments */}
              <div className="flex-1 overflow-y-auto flex flex-col">
                <div className="p-5 border-b border-primary/[0.06]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {lightbox.display_name && (
                        <>
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px] shrink-0">
                            <div className="w-full h-full rounded-full bg-bg flex items-center justify-center text-sm font-bold text-text">
                              {lightbox.display_name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="text-text text-sm font-bold truncate">{lightbox.display_name}</p>
                            {lightbox.username && <p className="text-text-muted text-xs">@{lightbox.username}</p>}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {onLike && (
                        <button onClick={() => onLike(lightbox.id)} className="flex items-center gap-1.5 text-hot hover:scale-110 transition-transform font-semibold text-sm">
                          <Heart className="w-4 h-4" />
                          {lightbox.like_count}
                        </button>
                      )}
                      {onDelete && currentUserId === lightbox.user_id && (
                        <button
                          onClick={() => { onDelete(lightbox.id); handleCloseLightbox(); }}
                          aria-label="Delete photo"
                          className="text-error hover:text-error/80 transition text-sm flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {lightbox.caption && (
                    <p className="text-text text-sm">
                      <span className="font-bold">{lightbox.display_name}:</span> <span className="text-text-muted">{lightbox.caption}</span>
                    </p>
                  )}
                  <p className="text-text-dim text-[10px] mt-2">
                    {new Date(lightbox.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>

                {/* Comments */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {commentError && <div className="text-error text-xs bg-error/10 px-3 py-2 rounded-xl">{commentError}</div>}
                  {loadingComments ? (
                    <div className="flex items-center justify-center gap-2 py-6">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <span className="text-text-muted text-xs">Loading comments...</span>
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-text-dim text-xs text-center py-6">No comments yet</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent p-[1px] shrink-0">
                          <div className="w-full h-full rounded-full bg-bg flex items-center justify-center text-[10px] font-bold text-text">
                            {comment.display_name?.charAt(0).toUpperCase() || "?"}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">
                            <span className="text-text font-bold mr-1">{comment.display_name || comment.username || "User"}</span>
                            <span className="text-text-muted">{comment.comment_text}</span>
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-text-dim mt-1">
                            <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" /> {comment.like_count}</span>
                            {currentUserId === comment.user_id && (
                              <button onClick={() => handleDeleteComment(comment.id)} className="text-error hover:text-error/80 transition">Delete</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input */}
                <div className="p-4 border-t border-primary/[0.06] shrink-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      aria-label="Add a comment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
                      maxLength={500}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
                          handleAddComment();
                        }
                      }}
                      disabled={postingComment}
                      className="input-luxe flex-1 rounded-xl px-4 py-2.5 text-sm"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={postingComment || !newComment.trim()}
                      aria-label="Send comment"
                      className="btn-primary-luxe px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center gap-1"
                    >
                      {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Close */}
            <button
              onClick={() => handleCloseLightbox()}
              aria-label="Close lightbox"
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-bg/60 backdrop-blur-md border border-primary/10 flex items-center justify-center text-text hover:bg-bg/80 transition z-10"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
