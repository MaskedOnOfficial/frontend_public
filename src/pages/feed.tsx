import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

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
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarPlaceholder({ name }: { name: string }) {
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-bg text-sm font-bold flex-shrink-0">
      {getInitials(name)}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-2xl overflow-hidden border border-white/5 animate-pulse">
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-full bg-surface-light" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-surface-light rounded w-32" />
          <div className="h-2 bg-surface-light rounded w-20" />
        </div>
      </div>
      <div className="w-full aspect-square bg-surface-light" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-surface-light rounded w-3/4" />
        <div className="h-2 bg-surface-light rounded w-1/2" />
      </div>
    </div>
  );
}

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
    <article className="glass-panel rounded-2xl overflow-hidden transition-shadow duration-300 hover:shadow-[0_16px_35px_rgba(0,0,0,0.35)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link
          to={`/profile/${post.user_id}`}
          className="flex items-center gap-3 group"
        >
          {post.avatar_url ? (
            <img
              src={post.avatar_url}
              alt={post.display_name}
              className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-primary transition-colors"
            />
          ) : (
            <AvatarPlaceholder name={post.display_name} />
          )}
          <div>
            <p className="text-text font-semibold text-sm group-hover:text-primary transition-colors leading-tight">
              {post.display_name}
            </p>
            <p className="text-text-muted text-xs">@{post.username}</p>
          </div>
        </Link>
        <span className="text-text-muted text-xs">{timeAgo(post.created_at)}</span>
      </div>

      {/* Photo */}
      <div className="relative w-full bg-surface-light min-h-[260px]">
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
        <img
          src={post.image_url}
          alt={post.caption ?? "Party photo"}
          onLoad={() => setImgLoaded(true)}
          className={`w-full object-cover max-h-[520px] transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
        />
        {/* Party tag badge */}
        {post.party_id && (
          <Link
            to={`/parties/${post.party_id}`}
            className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 hover:bg-primary/80 transition-colors"
          >
            🎉 Party Photo
          </Link>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3">
        {/* Like row */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => onLikeToggle(post.id, post.liked_by_me)}
            className={`flex items-center gap-1.5 text-sm font-medium transition-all duration-150 hover:scale-110 ${
              post.liked_by_me ? "text-error" : "text-text-muted hover:text-error"
            }`}
          >
            <span className="text-lg">{post.liked_by_me ? "❤️" : "🤍"}</span>
            <span>{post.like_count}</span>
          </button>
          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-primary transition-all duration-150 hover:scale-110"
          >
            <span className="text-lg">💬</span>
            <span>Comment</span>
          </button>
        </div>

        {showComments && (
          <div className="mt-3 mb-2 space-y-3">
            {commentError && (
              <div className="text-error text-xs bg-error/10 px-3 py-2 rounded-lg">{commentError}</div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="Write a comment..."
                disabled={postingComment}
                className="input-luxe flex-1 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={handleAddComment}
                disabled={postingComment || !commentText.trim()}
                className="btn-primary-luxe px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {postingComment ? "..." : "Post"}
              </button>
            </div>

            {loadingComments ? (
              <p className="text-text-muted text-xs">Loading comments...</p>
            ) : comments.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {comments.map((comment) => (
                  <div key={comment.id} className="text-sm">
                    <p className="text-text-muted text-xs">
                      {comment.display_name || comment.username || "User"}
                    </p>
                    <p className="text-text">{comment.comment_text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-xs">No comments yet</p>
            )}
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-text text-sm leading-relaxed">
            <Link
              to={`/profile/${post.user_id}`}
              className="font-semibold text-primary hover:underline mr-1"
            >
              {post.username}
            </Link>
            {post.caption}
          </p>
        )}
      </div>
    </article>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="text-6xl mb-6 select-none">🎭</div>
      <h2 className="text-text text-2xl font-bold mb-3">Your feed is empty</h2>
      <p className="text-text-muted text-base max-w-sm mb-8">
        Connect with friends to start seeing their party photos right here.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          to="/search"
          className="btn-primary-luxe font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          Find Friends
        </Link>
        <Link
          to="/parties"
          className="btn-secondary-luxe font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          Discover Parties
        </Link>
      </div>
    </div>
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

  function handleLikeToggle(postId: string, currentLiked: boolean) {
    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked_by_me: !currentLiked,
              like_count: currentLiked ? p.like_count - 1 : p.like_count + 1,
            }
          : p
      )
    );

    // API call (fire and forget, revert on failure)
    const endpoint = currentLiked
      ? `/photos/${postId}/like`
      : `/photos/${postId}/like`;
    const method = currentLiked ? "delete" : "post";

    api[method](endpoint).catch(() => {
      // Revert optimistic update on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                liked_by_me: currentLiked,
                like_count: currentLiked ? p.like_count + 1 : p.like_count - 1,
              }
            : p
        )
      );
    });
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Page header */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text">
              Hey,{" "}
              <span className="brand-gradient-text">
                {user?.display_name?.split(" ")[0]}
              </span>{" "}
              👋
            </h1>
            <p className="text-text-muted text-sm mt-0.5">
              Here's what your friends have been up to.
            </p>
          </div>
          <Link
            to="/parties/create"
            className="btn-primary-luxe text-sm font-semibold px-4 py-2 rounded-xl transition-colors whitespace-nowrap text-center"
          >
            + Host Party
          </Link>
        </div>
      </div>

      {/* Feed content */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        {/* Error */}
        {error && (
          <div className="bg-error/10 border border-error/30 rounded-xl p-4 text-error text-sm mb-6">
            {error}{" "}
            <button
              onClick={() => fetchFeed(1, false)}
              className="underline ml-1 hover:text-error/80"
            >
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
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="btn-secondary-luxe font-medium px-8 py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <span className="w-4 h-4 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
                      Loading…
                    </>
                  ) : (
                    "Load more"
                  )}
                </button>
              </div>
            )}

            {!hasMore && (
              <p className="text-center text-text-muted text-sm py-6">
                You're all caught up! 🎉
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && posts.length === 0 && !error && <EmptyFeed />}
      </div>
    </div>
  );
}
