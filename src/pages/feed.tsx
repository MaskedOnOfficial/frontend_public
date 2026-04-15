import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { hapticsMedium } from "../lib/haptics";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Sparkles, Users, PartyPopper,
  Loader2, RefreshCw, Send, MapPin, Calendar, TrendingUp,
  Flame, Eye, ChevronRight, Zap,
} from "lucide-react";

// --- Types ---

interface FeedPost {
  id: string;
  user_id: string;
  party_id: string | null;
  image_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  like_count: number;
  view_count?: number;
  comment_count?: number;
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

interface StoryUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  recent_photo_count: number;
  latest_photo_url: string;
  latest_photo_at: string;
}

interface UpcomingParty {
  id: string;
  title: string;
  cover_image_url: string | null;
  date_time: string;
  location_city: string;
  ticket_price: number;
  current_attendees: number;
  max_capacity: number;
  host_id: string;
  host_display_name: string;
  host_avatar_url: string | null;
}

interface TrendingPost extends FeedPost {
  comment_count: number;
  view_count: number;
}

// --- Helpers ---

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatPrice(price: number): string {
  if (price === 0) return "Free";
  return `\u20B9${(price / 100).toLocaleString("en-IN")}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// --- Skeleton Components ---

function SkeletonStories() {
  return (
    <div className="flex gap-3.5 px-4 py-3 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="w-[60px] h-[60px] rounded-full shimmer" />
          <div className="h-2 w-10 shimmer rounded" />
        </div>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="feed-card">
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-full shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 shimmer rounded-lg w-28" />
          <div className="h-2.5 shimmer rounded-lg w-20" />
        </div>
      </div>
      <div className="w-full aspect-[4/3] shimmer" />
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

function SkeletonTrending() {
  return (
    <div className="mx-4 rounded-2xl overflow-hidden shimmer h-48" />
  );
}

// --- Stories Strip ---

function StoriesStrip({ stories, currentUserId }: { stories: StoryUser[]; currentUserId?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  if (stories.length === 0) return null;

  return (
    <div className="feed-stories-container">
      <div ref={scrollRef} className="feed-stories-scroll">
        {/* Your story (placeholder) */}
        {currentUserId && (
          <Link to="/profile/me" className="feed-story-item">
            <div className="feed-story-ring-own">
              <div className="feed-story-avatar">
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">+</span>
                </div>
              </div>
            </div>
            <span className="feed-story-name">You</span>
          </Link>
        )}
        {stories.map((s) => (
          <Link key={s.user_id} to={`/profile/${s.user_id}`} className="feed-story-item">
            <div className="feed-story-ring">
              <div className="feed-story-avatar">
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt={s.display_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{getInitials(s.display_name)}</span>
                  </div>
                )}
              </div>
            </div>
            <span className="feed-story-name">{s.display_name.split(" ")[0]}</span>
            {s.recent_photo_count > 1 && (
              <span className="feed-story-count">{s.recent_photo_count}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

// --- Trending Card ---

function TrendingCard({ post, onLikeToggle }: { post: TrendingPost; onLikeToggle: (id: string, liked: boolean) => void }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4"
    >
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <div className="flex items-center gap-1.5 text-hot">
          <Flame className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Trending in your circle</span>
        </div>
      </div>
      <div className="feed-trending-card group">
        <div className="relative overflow-hidden rounded-2xl">
          {!imgLoaded && <div className="absolute inset-0 shimmer aspect-[16/9]" />}
          <img
            src={post.image_url}
            alt={post.caption || "Trending photo"}
            onLoad={() => setImgLoaded(true)}
            className={`w-full aspect-[16/9] object-cover transition-all duration-700 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Trending badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-hot/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" />
            Top Post
          </div>

          {/* Bottom content */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <Link to={`/profile/${post.user_id}`} className="shrink-0">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/30">
                  {post.avatar_url ? (
                    <img src={post.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">{getInitials(post.display_name)}</span>
                    </div>
                  )}
                </div>
              </Link>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm truncate">{post.display_name}</p>
                <p className="text-white/60 text-[10px]">{timeAgo(post.created_at)}</p>
              </div>
            </div>
            {post.caption && (
              <p className="text-white/80 text-xs line-clamp-2 mb-2">{post.caption}</p>
            )}
            <div className="flex items-center gap-4">
              <button
                onClick={(e) => { e.preventDefault(); onLikeToggle(post.id, post.liked_by_me); }}
                className="flex items-center gap-1.5 text-white/90 hover:text-hot transition"
              >
                <Heart className={`w-4 h-4 ${post.liked_by_me ? "fill-hot text-hot" : ""}`} />
                <span className="text-xs font-semibold">{post.like_count}</span>
              </button>
              <span className="flex items-center gap-1.5 text-white/60">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">{post.comment_count}</span>
              </span>
              <span className="flex items-center gap-1.5 text-white/60">
                <Eye className="w-3.5 h-3.5" />
                <span className="text-xs">{post.view_count}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Upcoming Parties Strip ---

function UpcomingPartiesStrip({ parties }: { parties: UpcomingParty[] }) {
  if (parties.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-5 mb-2.5">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-accent" />
          <span className="text-xs font-bold uppercase tracking-widest text-accent">Friends hosting</span>
        </div>
        <Link to="/parties" className="text-[10px] font-semibold text-text-dim hover:text-primary transition flex items-center gap-0.5">
          See all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 feed-scroll-hide">
        {parties.map((p) => (
          <Link key={p.id} to={`/parties/${p.id}`} className="feed-party-chip group">
            <div className="relative w-full h-20 overflow-hidden rounded-t-xl">
              {p.cover_image_url ? (
                <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/15 flex items-center justify-center">
                  <PartyPopper className="w-5 h-5 text-primary/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-1.5 right-2 text-[10px] font-bold text-white/90">{formatPrice(p.ticket_price)}</span>
            </div>
            <div className="p-2 space-y-0.5">
              <p className="text-text text-[11px] font-bold truncate">{p.title}</p>
              <div className="flex items-center gap-1 text-text-dim">
                <Calendar className="w-2.5 h-2.5" />
                <span className="text-[9px]">{formatShortDate(p.date_time)} {formatTime(p.date_time)}</span>
              </div>
              <div className="flex items-center gap-1 text-text-dim">
                <MapPin className="w-2.5 h-2.5" />
                <span className="text-[9px] truncate">{p.location_city}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// --- Post Card ---

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

  // Track view  
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

  // Double-tap heart
  const lastTapRef = useRef(0);
  const heartTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
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
      const res = await api.post(`/photos/${post.id}/comments`, { comment_text: commentText.trim() });
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
    if (next && comments.length === 0) loadComments();
  }

  const engagementLevel = useMemo(() => {
    const likes = post.like_count || 0;
    const views = post.view_count || 0;
    if (likes >= 10 || views >= 50) return "hot";
    if (likes >= 5 || views >= 20) return "warm";
    return null;
  }, [post.like_count, post.view_count]);

  return (
    <motion.article
      ref={postRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="feed-card"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link to={`/profile/${post.user_id}`} className="shrink-0">
          <div className="feed-avatar-ring p-[2px] rounded-full">
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
          <div className="flex items-center gap-1.5">
            <p className="text-text font-bold text-[13px] leading-tight truncate group-hover:text-primary transition-colors">
              {post.display_name}
            </p>
            {engagementLevel === "hot" && (
              <Flame className="w-3 h-3 text-hot shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-text-dim text-[11px]">
            <span>{timeAgo(post.created_at)}</span>
            {post.party_id && (
              <>
                <span className="text-border">·</span>
                <span className="text-primary/70 flex items-center gap-0.5">
                  <PartyPopper className="w-2.5 h-2.5" />
                  Party
                </span>
              </>
            )}
          </div>
        </Link>
        {post.view_count !== undefined && post.view_count > 0 && (
          <span className="flex items-center gap-1 text-text-dim text-[10px] shrink-0">
            <Eye className="w-3 h-3" />
            {post.view_count}
          </span>
        )}
      </div>

      {/* Photo */}
      <div className="relative w-full bg-surface cursor-pointer" onClick={handleTap}>
        {!imgLoaded && (
          <div className="absolute inset-0 shimmer aspect-[4/3]" />
        )}
        <img
          src={post.image_url}
          alt={post.caption ?? "Party photo"}
          onLoad={() => setImgLoaded(true)}
          className={`w-full object-cover max-h-[560px] transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
        />
        {/* Double tap heart */}
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

      {/* Actions + Content */}
      <div className="px-4 pt-3 pb-3">
        {/* Action row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
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
          {/* Engagement indicator */}
          {engagementLevel && (
            <div className={`feed-engagement-badge ${engagementLevel === "hot" ? "feed-badge-hot" : "feed-badge-warm"}`}>
              {engagementLevel === "hot" ? <Flame className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              <span>{engagementLevel === "hot" ? "Popular" : "Rising"}</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-1.5">
          {post.like_count > 0 && (
            <p className="text-text font-bold text-[13px]">
              {post.like_count.toLocaleString()} {post.like_count === 1 ? "like" : "likes"}
            </p>
          )}
          {(post.comment_count ?? 0) > 0 && (
            <button onClick={toggleComments} className="text-text-dim text-[12px] hover:text-text-muted transition">
              {post.comment_count} {post.comment_count === 1 ? "comment" : "comments"}
            </button>
          )}
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-[13px] leading-relaxed mb-1">
            <Link to={`/profile/${post.user_id}`} className="font-bold text-text hover:text-primary transition mr-1.5">
              {post.display_name}
            </Link>
            <span className="text-text-muted">{post.caption}</span>
          </p>
        )}

        {/* View comments toggle */}
        {!showComments && (post.comment_count ?? 0) > 0 && (
          <button
            onClick={toggleComments}
            className="text-text-dim text-xs mt-0.5 hover:text-text-muted transition"
          >
            View all {post.comment_count} comments
          </button>
        )}

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
              <div className="mt-3 space-y-3 border-t border-border/50 pt-3">
                {commentError && (
                  <div className="text-error text-xs bg-error/10 px-3 py-2 rounded-lg">{commentError}</div>
                )}

                {/* Comment input */}
                <div className="flex gap-2 items-center">
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
                    className="feed-send-btn disabled:opacity-30"
                  >
                    {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>

                {loadingComments ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span className="text-text-muted text-xs">Loading comments...</span>
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1 feed-comments-scroll">
                    {comments.map((comment) => (
                      <div key={comment.id} className="text-sm flex gap-2">
                        <span className="font-semibold text-text text-xs shrink-0">
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

// --- Empty State ---

function EmptyFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center px-4"
    >
      <div className="feed-empty-icon mb-5">
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

// --- Main Feed Page ---

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  // Enrichment data (first page only)
  const [stories, setStories] = useState<StoryUser[]>([]);
  const [trendingPost, setTrendingPost] = useState<TrendingPost | null>(null);
  const [upcomingParties, setUpcomingParties] = useState<UpcomingParty[]>([]);

  const LIMIT = 12;

  const fetchFeed = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError("");

    try {
      const res = await api.get(`/feed?page=${pageNum}&limit=${LIMIT}`);
      const data = res.data.data;
      setPosts((prev) => (append ? [...prev, ...data.posts] : data.posts));
      setHasMore(data.hasMore);

      // First page enrichment
      if (pageNum === 1) {
        setStories(data.stories || []);
        setTrendingPost(data.trending_post || null);
        setUpcomingParties(data.upcoming_parties || []);
      }
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

  // Infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchFeed(nextPage, true);
        }
      },
      { rootMargin: "200px" }
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, loadingMore, page, fetchFeed]);

  // Like toggle with optimistic update
  const likeInFlightRef = useRef<Set<string>>(new Set());
  function handleLikeToggle(postId: string, currentLiked: boolean) {
    if (likeInFlightRef.current.has(postId)) return;
    likeInFlightRef.current.add(postId);
    hapticsMedium();

    // Update in posts list
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked_by_me: !currentLiked, like_count: Math.max(0, currentLiked ? p.like_count - 1 : p.like_count + 1) }
          : p
      )
    );

    // Also update trending post if it matches
    setTrendingPost((prev) => {
      if (prev && prev.id === postId) {
        return { ...prev, liked_by_me: !currentLiked, like_count: Math.max(0, currentLiked ? prev.like_count - 1 : prev.like_count + 1) };
      }
      return prev;
    });

    const endpoint = `/photos/${postId}/like`;
    const method = currentLiked ? "delete" : "post";

    api[method](endpoint).catch(() => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked_by_me: currentLiked, like_count: Math.max(0, currentLiked ? p.like_count + 1 : p.like_count - 1) }
            : p
        )
      );
      setTrendingPost((prev) => {
        if (prev && prev.id === postId) {
          return { ...prev, liked_by_me: currentLiked, like_count: Math.max(0, currentLiked ? prev.like_count + 1 : prev.like_count - 1) };
        }
        return prev;
      });
    }).finally(() => {
      likeInFlightRef.current.delete(postId);
    });
  }

  // Refresh
  const [refreshing, setRefreshing] = useState(false);
  async function handleRefresh() {
    setRefreshing(true);
    setPage(1);
    await fetchFeed(1, false);
    setRefreshing(false);
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Subtle top bar with refresh */}
      <div className="max-w-2xl mx-auto px-4 pt-4 md:pt-6 pb-2 flex items-center justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="feed-refresh-btn tap-active"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stories Strip */}
      {loading ? (
        <SkeletonStories />
      ) : stories.length > 0 ? (
        <StoriesStrip stories={stories} currentUserId={user?.id} />
      ) : null}

      {/* Main Feed */}
      <div className="max-w-2xl mx-auto px-4 pb-28 md:pb-16">
        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-error/10 border border-error/20 rounded-xl p-4 text-error text-sm mb-4 flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => fetchFeed(1, false)} className="underline ml-2 hover:text-error/80 font-semibold">
              Retry
            </button>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-5">
            <SkeletonTrending />
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Content */}
        {!loading && posts.length > 0 && (
          <div className="space-y-5">
            {/* Trending post */}
            {trendingPost && (
              <TrendingCard post={trendingPost} onLikeToggle={handleLikeToggle} />
            )}

            {/* Upcoming friend parties */}
            {upcomingParties.length > 0 && (
              <UpcomingPartiesStrip parties={upcomingParties} />
            )}

            {/* Divider before feed */}
            {(trendingPost || upcomingParties.length > 0) && (
              <div className="flex items-center gap-3 px-2 pt-1">
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Your feed</span>
                <div className="h-px flex-1 bg-border/50" />
              </div>
            )}

            {/* Feed posts */}
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLikeToggle={handleLikeToggle}
              />
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2 text-text-muted text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Loading more...
                </div>
              </div>
            )}

            {/* End of feed */}
            {!hasMore && !loadingMore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border/50">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="text-text-dim text-sm font-medium">You're all caught up!</p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && posts.length === 0 && !error && <EmptyFeed />}
      </div>
    </div>
  );
}
