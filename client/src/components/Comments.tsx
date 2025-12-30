import { useState, useEffect, FC } from "react";
import { useAuth } from "../context/AuthContext";
import { Comment, CommentSortOption } from "../../../shared/src/types";

interface CommentsProps {
  postId: number;
}

const Comments: FC<CommentsProps> = ({ postId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sortBy, setSortBy] = useState<CommentSortOption>("likes");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    try {
      const headers: HeadersInit = {};
      if (user?.token) {
        headers.Authorization = `Bearer ${user.token}`;
      }

      const response = await fetch(`/api/posts/${postId}/comments?sort=${sortBy}`, { headers });
      if (!response.ok) throw new Error("Failed to fetch comments");

      const data = await response.json();
      setComments(data.comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId, sortBy]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.token || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!response.ok) throw new Error("Failed to post comment");

      setNewComment("");
      await fetchComments(); // Refresh comments
    } catch (error) {
      console.error("Error posting comment:", error);
      alert("Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: number) => {
    if (!user || !user.token) {
      alert("Please login to like comments");
      return;
    }

    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to like comment");

      await fetchComments(); // Refresh to update like status
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    if (!user || !user.token) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete comment");

      await fetchComments(); // Refresh comments
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment. Please try again.");
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="mt-12 border-t border-[var(--border)] pt-8">
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
        Comments ({comments.length})
      </h2>

      {/* Comment Form */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="mb-8">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            rows={4}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
            disabled={submitting}
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              {submitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-center">
          <p className="text-[var(--text-secondary)]">
            Please <a href="/auth" className="text-[var(--primary)] hover:underline">login</a> to comment
          </p>
        </div>
      )}

      {/* Sort Options */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm text-[var(--text-secondary)]">Sort by:</span>
        <div className="flex gap-2">
          {(["likes", "newest", "oldest"] as CommentSortOption[]).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                sortBy === option
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--primary)] hover:bg-opacity-20"
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--spinner)]"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--primary)] transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {comment.user_email}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-[var(--text-primary)] whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
                {user && comment.user_id === user.id && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-red-500 hover:text-red-700 text-sm ml-4"
                    title="Delete comment"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Like Button */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => handleLikeComment(comment.id)}
                  disabled={!user}
                  className={`flex items-center gap-1 transition-all ${
                    comment.user_has_liked
                      ? "text-red-500"
                      : "text-[var(--text-secondary)] hover:text-red-500"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={user ? (comment.user_has_liked ? "Unlike" : "Like") : "Login to like"}
                >
                  <svg
                    className={`w-5 h-5 ${comment.user_has_liked ? "fill-current animate-pulse" : ""}`}
                    fill={comment.user_has_liked ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Comments;
