import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
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
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-full shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 shimmer rounded-lg w-28" />
          <div className="h-2.5 shimmer rounded-lg w-20" />
        </div>
      </div>
      {/* #28 — Match skeleton to actual card aspect ratio */}
      <div className="w-full aspect-[4/3] shimmer" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <div className="h-5 w-14 shimmer rounded-lg" />
          <div className="h-5 w-20 shimmer rounded-lg" />
        </div>
        <div className="h-3.5 shimmer rounded-lg w-3/4" />
        <div className="h-2.5 shimmer rounded-lg w-1/2" />
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

  // #23 — Proper double-tap detection for mobile
  const lastTapRef = useRef(0);
  const heartTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      // Double tap detected
      if (!post.liked_by_me) {
        onLikeToggle(post.id, false);
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-accent to-hot p-[2px]">
            <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center">
              {post.avatar_url ? (
                <img src={post.avatar_url} alt={post.display_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-text">{getInitials(post.display_name)}</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-text font-semibold text-sm group-hover:text-primary transition-colors leading-tight">
              {post.display_name}
            </p>
            <p className="text-text-dim text-xs">@{post.username}</p>
          </div>
        </Link>
        <span className="text-text-dim text-xs font-medium">{timeAgo(post.created_at)}</span>
      </div>

      {/* Photo */}
      <div className="relative w-full bg-surface min-h-[200px] cursor-pointer" onClick={handleTap}>
        {!imgLoaded && (
          <div className="absolute inset-0 shimmer" />
        )}
        <img
          src={post.image_url}
          alt={post.caption ?? "Party photo"}
          onLoad={() => setImgLoaded(true)}
          className={`w-full object-cover max-h-[480px] transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
        />
        {/* Party tag */}
        {post.party_id && (
          <Link
            to={`/parties/${post.party_id}`}
            className="absolute top-3 left-3 bg-bg/70 backdrop-blur-md text-text text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-primary/80 transition border border-primary/15"
          >
            <PartyPopper className="w-3 h-3 text-primary" />
            Party Photo
          </Link>
        )}
        {/* Double tap heart animation */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-20 h-20 text-hot fill-hot drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 py-3">
        {/* Action row */}
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => onLikeToggle(post.id, post.liked_by_me)}
            className={`flex items-center gap-1.5 text-sm font-semibold transition-all duration-200 hover:scale-110 active:scale-95 ${
              post.liked_by_me ? "text-hot" : "text-text-muted hover:text-hot"
            }`}
          >
            <Heart className={`w-5 h-5 ${post.liked_by_me ? "fill-current" : ""}`} />
            <span>{post.like_count}</span>
          </button>
          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-primary transition-all duration-200 hover:scale-110"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Comment</span>
          </button>
        </div>

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
              <div className="mt-3 mb-2 space-y-3 border-t border-primary/[0.06] pt-3">
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

        {/* Caption */}
        {post.caption && (
          <p className="text-text text-sm leading-relaxed mt-1">
            <Link
              to={`/profile/${post.user_id}`}
              className="font-bold text-text hover:text-primary transition mr-1.5"
            >
              {post.display_name}
            </Link>
            <span className="text-text-muted">{post.caption}</span>
          </p>
        )}
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
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/15 to-hot/10 border border-primary/10 flex items-center justify-center mb-6">
        <Sparkles className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-text text-2xl font-bold mb-3">Your feed is empty</h2>
      <p className="text-text-muted text-sm max-w-sm mb-8 leading-relaxed">
        Connect with friends and discover parties to start seeing their moments here.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          to="/search"
          className="btn-primary-luxe font-bold px-6 py-3 rounded-xl flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Find Friends
        </Link>
        <Link
          to="/parties"
          className="btn-secondary-luxe font-semibold px-6 py-3 rounded-xl flex items-center gap-2"
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
          className="glass-panel rounded-2xl p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold text-text tracking-tight">
              Hey,{" "}
              <span className="brand-gradient-text">
                {user?.display_name?.split(" ")[0]}
              </span>{" "}
              👋
            </h1>
            <p className="text-text-muted text-sm mt-1">
              Here's what your friends have been up to.
            </p>
          </div>
          {/* #27 — Refresh button */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleRefresh} disabled={refreshing}
              className="btn-secondary-luxe text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 justify-center whitespace-nowrap disabled:opacity-50 tap-active flex-1 sm:flex-initial">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              to="/parties/create"
              className="btn-hot-luxe text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 justify-center whitespace-nowrap flex-1 sm:flex-initial"
            >
              <PartyPopper className="w-4 h-4" />
              Host Party
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
