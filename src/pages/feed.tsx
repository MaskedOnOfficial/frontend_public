import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { hapticsMedium } from "../lib/haptics";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Sparkles, Users, PartyPopper, ChevronDown, Loader2, RefreshCw } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedPost {
  id: string;
  user_id: string;
  party_id: string | null;
  image_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  like_count: number;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  liked_by_me: boolean;
  feed_score: number;
}

interface FeedComment {
  id: string;
  user_id: string;
  comment_text: string;
  like_count: number;
  created_at: string;
  display_name?: string;
  username?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d`;
  return new Date(dateStr).toLocaleDateString();
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="post-card">
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-full shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 shimmer rounded-lg w-28" />
          <div className="h-2.5 shimmer rounded-lg w-20" />
        </div>
      </div>
      <div className="w-full aspect-[4/3] img-skeleton" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <div className="h-6 w-6 shimmer rounded-full" />
          <div className="h-6 w-6 shimmer rounded-full" />
        </div>
        <div className="h-3.5 shimmer rounded-lg w-20" />
        <div className="h-3 shimmer rounded-lg w-3/4" />
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: FeedPost;
  onLikeToggle: (postId: string, currentLiked: boolean) => void;
}

function PostCard({ post, onLikeToggle }: PostCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [showHeart, setShowHeart] = useState(false);
  const viewTracked = useRef(false);

  // Track view when post scrolls into viewport
  const postRef = useCallback((el: HTMLElement | null) => {
    if (!el || viewTracked.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !viewTracked.current) {
        viewTracked.current = true;
        api.post(`/photos/${post.id}/view`).catch(() => {});
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(el);
  }, [post.id]);

  // #23 — Proper double-tap detection for mobile
  const lastTapRef = useRef(0);
  const heartTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      // Double tap detected
      if (!post.liked_by_me) {
        onLikeToggle(post.id, false);
        hapticsMedium();
        setShowHeart(true);
        clearTimeout(heartTimerRef.current);
        heartTimerRef.current = setTimeout(() => setShowHeart(false), 800);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }

  useEffect(() => {
    return () => clearTimeout(heartTimerRef.current);
  }, []);

  async function loadComments() {
    setLoadingComments(true);
    setCommentError("");
    try {
      const res = await api.get(`/photos/${post.id}/comments`);
      setComments(res.data.data.comments || []);
    } catch (error) {
      setCommentError(getApiErrorMessage(error, "Failed to load comments"));
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    setPostingComment(true);
    setCommentError("");
    try {
      const res = await api.post(`/photos/${post.id}/comments`, {
        comment_text: commentText.trim(),
      });
      setComments((prev) => [res.data.data.comment, ...prev]);
      setCommentText("");
    } catch (error) {
      setCommentError(getApiErrorMessage(error, "Failed to post comment"));
    } finally {
      setPostingComment(false);
    }
  }

  function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      loadComments();
    }
  }

  return (
    <motion.article
      ref={postRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="post-card"
    >
      {/* Header — Instagram-style: avatar ring, name, time */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link to={`/profile/${post.user_id}`} className="shrink-0">
          <div className="avatar-ring-gradient p-[2px] rounded-full">
            <div className="w-9 h-9 rounded-full bg-bg overflow-hidden border-[1.5px] border-bg flex items-center justify-center">
              {post.avatar_url ? (
                <img src={post.avatar_url} alt={post.display_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-text">{getInitials(post.display_name)}</span>
              )}
            </div>
          </div>
        </Link>
        <Link to={`/profile/${post.user_id}`} className="flex-1 min-w-0 group">
          <p className="text-text font-bold text-[13px] leading-tight truncate group-hover:text-primary transition-colors">
            {post.display_name}
          </p>
          <p className="text-text-dim text-[11px]">{timeAgo(post.created_at)}</p>
        </Link>
      </div>

      {/* Photo — full bleed */}
      <div className="relative w-full bg-surface cursor-pointer" onClick={handleTap}>
        {!imgLoaded && (
          <div className="absolute inset-0 img-skeleton aspect-[4/3]" />
        )}
        <img
          src={post.image_url}
          alt={post.caption ?? "Party photo"}
          onLoad={() => setImgLoaded(true)}
          className={`w-full object-cover max-h-[520px] transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
        />
        {/* Party tag */}
        {post.party_id && (
          <Link
            to={`/parties/${post.party_id}`}
            className="absolute top-3 left-3 bg-bg/70 backdrop-blur-md text-text text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-primary/80 transition border border-white/10"
          >
            <PartyPopper className="w-3.5 h-3.5 text-primary" />
            Party
          </Link>
        )}
        {/* Double tap heart — bigger, with glow */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-24 h-24 text-white fill-white drop-shadow-[0_0_40px_rgba(236,72,153,0.6)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions + Caption + Comments */}
      <div className="px-4 pt-3 pb-3">
        {/* Action row — larger icons, Instagram style */}
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => onLikeToggle(post.id, post.liked_by_me)}
            className={`transition-all duration-200 active:scale-75 ${
              post.liked_by_me ? "text-hot" : "text-text-muted hover:text-text"
            }`}
          >
            <Heart className={`w-[24px] h-[24px] ${post.liked_by_me ? "fill-current animate-heart-like" : ""}`} />
          </button>
          <button
            onClick={toggleComments}
            className="text-text-muted hover:text-text transition-all duration-200 active:scale-90"
          >
            <MessageCircle className="w-[24px] h-[24px]" />
          </button>
        </div>

        {/* Like count — Instagram bold style */}
        {post.like_count > 0 && (
          <p className="text-text font-bold text-[13px] mb-1.5">
            {post.like_count.toLocaleString()} {post.like_count === 1 ? "like" : "likes"}
          </p>
        )}

        {/* Caption — name + text inline */}
        {post.caption && (
          <p className="text-[13px] leading-relaxed mb-1">
            <Link
              to={`/profile/${post.user_id}`}
              className="font-bold text-text hover:text-primary transition mr-1.5"
            >
              {post.display_name}
            </Link>
            <span className="text-text-muted">{post.caption}</span>
          </p>
        )}

        {/* View comments toggle */}
        <button
          onClick={toggleComments}
          className="text-text-dim text-xs mt-0.5 hover:text-text-muted transition"
        >
          {showComments ? "Hide comments" : "View comments"}
        </button>

        {/* Comments section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3 border-t border-primary/[0.06] pt-3">
                {commentError && (
                  <div className="text-error text-xs bg-error/10 px-3 py-2 rounded-lg">{commentError}</div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    aria-label="Add a comment"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    placeholder="Add a comment..."
                    disabled={postingComment}
                    className="input-luxe flex-1 rounded-xl px-4 py-2.5 text-sm"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={postingComment || !commentText.trim()}
                    className="btn-primary-luxe px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                  >
                    {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
                  </button>
                </div>

                {loadingComments ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span className="text-text-muted text-xs">Loading comments...</span>
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {comments.map((comment) => (
                      <div key={comment.id} className="text-sm">
                        <span className="font-semibold text-text text-xs mr-1.5">
                          {comment.display_name || comment.username || "User"}
                        </span>
                        <span className="text-text-muted text-xs">{comment.comment_text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-dim text-xs py-1">No comments yet. Be the first!</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center px-4"
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 via-accent/10 to-hot/5 border border-primary/[0.08] flex items-center justify-center mb-5">
        <Sparkles className="w-8 h-8 text-primary/60" />
      </div>
      <h2 className="text-text text-xl font-bold mb-2">Your feed is empty</h2>
      <p className="text-text-muted text-sm max-w-xs mb-6 leading-relaxed">
        Connect with friends and discover parties to start seeing their moments here.
      </p>
      <div className="flex gap-2.5 flex-wrap justify-center">
        <Link
          to="/search"
          className="btn-primary-luxe font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Find Friends
        </Link>
        <Link
          to="/parties"
          className="btn-secondary-luxe font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
        >
          <PartyPopper className="w-4 h-4" />
          Discover Parties
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Main Feed Page ────────────────────────────────────────────────────────────

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [page, setPage]   = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]   = useState("");

  const LIMIT = 12;

  const fetchFeed = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError("");

    try {
      const res = await api.get(`/feed?page=${pageNum}&limit=${LIMIT}`);
      const { posts: newPosts, hasMore: more } = res.data.data;
      setPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
      setHasMore(more);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load feed"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(1, false);
  }, [fetchFeed]);

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFeed(nextPage, true);
  }

  // #26 — Clamp like count to >= 0, debounce to prevent race condition
  const likeInFlightRef = useRef<Set<string>>(new Set());
  function handleLikeToggle(postId: string, currentLiked: boolean) {
    if (likeInFlightRef.current.has(postId)) return;
    likeInFlightRef.current.add(postId);
    hapticsMedium();

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked_by_me: !currentLiked,
              like_count: Math.max(0, currentLiked ? p.like_count - 1 : p.like_count + 1),
            }
          : p
      )
    );

    const endpoint = `/photos/${postId}/like`;
    const method = currentLiked ? "delete" : "post";

    api[method](endpoint).catch(() => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                liked_by_me: currentLiked,
                like_count: Math.max(0, currentLiked ? p.like_count + 1 : p.like_count - 1),
              }
            : p
        )
      );
    }).finally(() => {
      likeInFlightRef.current.delete(postId);
    });
  }

  // #27 — Refresh feed
  const [refreshing, setRefreshing] = useState(false);
  async function handleRefresh() {
    setRefreshing(true);
    setPage(1);
    await fetchFeed(1, false);
    setRefreshing(false);
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Page header */}
      <div className="max-w-2xl mx-auto px-4 pt-6 md:pt-8 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 mb-6"
        >
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-text tracking-tight">
              Hey,{" "}
              <span className="brand-gradient-text">
                {user?.display_name?.split(" ")[0]}
              </span>{" "}
              👋
            </h1>
            <p className="text-text-dim text-xs mt-0.5">
              Here's what your friends have been up to.
            </p>
          </div>
          {/* #27 — Refresh button */}
          <div className="flex gap-2 shrink-0">
            <button onClick={handleRefresh} disabled={refreshing}
              className="btn-secondary-luxe text-sm font-bold p-2.5 rounded-xl flex items-center justify-center disabled:opacity-50 tap-active">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <Link
              to="/parties/create"
              className="btn-hot-luxe text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 justify-center whitespace-nowrap"
            >
              <PartyPopper className="w-4 h-4" />
              <span className="hidden sm:inline">Host Party</span>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Feed content */}
      <div className="max-w-2xl mx-auto px-4 pb-28 md:pb-16">
        {/* Error */}
        {error && (
          <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error text-sm mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => fetchFeed(1, false)} className="underline ml-2 hover:text-error/80 font-semibold">
              Retry
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Posts */}
        {!loading && posts.length > 0 && (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLikeToggle={handleLikeToggle}
              />
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="btn-secondary-luxe font-semibold px-8 py-3 rounded-xl flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Load more
                    </>
                  )}
                </button>
              </div>
            )}

            {!hasMore && (
              <div className="text-center py-8">
                <p className="text-text-dim text-sm flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  You're all caught up!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && posts.length === 0 && !error && <EmptyFeed />}
      </div>
    </div>
  );
}
