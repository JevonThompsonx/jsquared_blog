"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { z } from "zod";

import { getAuthorHref } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { resolveCommentMutationComments } from "@/lib/comment-mutation-response";
import { formatCommentDate } from "@/lib/comment-utils";

type CommentSortOption = "likes" | "newest" | "oldest";
const COMMENT_SORT_OPTIONS: readonly CommentSortOption[] = [
  "likes",
  "newest",
  "oldest",
];

type PostComment = {
  id: string;
  postId: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  content: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  userHasLiked: boolean;
  canDelete: boolean;
  visibility: "visible" | "hidden" | "deleted";
};

const postCommentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  authorId: z.string(),
  authorDisplayName: z.string(),
  authorAvatarUrl: z.string().nullable(),
  content: z.string(),
  parentId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  likeCount: z.number(),
  userHasLiked: z.boolean(),
  canDelete: z.boolean(),
  visibility: z.enum(["visible", "hidden", "deleted"]),
});

const commentsResponseSchema = z.object({
  comments: z.array(postCommentSchema).optional(),
});

type CommentThread = PostComment & {
  replies: PostComment[];
  depth?: number;
  repliedTo?: string;
};

const MAX_VISUAL_DEPTH = 3;

/** Shared keyboard focus treatment for controls rendered on card surfaces. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)]";

function buildThreads(
  flat: PostComment[],
  sortBy: CommentSortOption,
): CommentThread[] {
  const visibleFlat = flat.filter(
    (c) => c.visibility === "visible" || c.visibility === "hidden",
  );
  const topLevel = visibleFlat.filter((c) => !c.parentId);
  const replyMap = new Map<string, PostComment[]>();

  for (const c of visibleFlat) {
    if (c.parentId) {
      const existing = replyMap.get(c.parentId) ?? [];
      replyMap.set(c.parentId, [...existing, c]);
    }
  }

  // Sort replies oldest-first always — create sorted copies in place
  for (const [, replies] of replyMap) {
    replies.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  // Sort top-level by the selected option
  const sorted = [...topLevel];
  if (sortBy === "likes") {
    sorted.sort((a, b) => {
      if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else if (sortBy === "oldest") {
    sorted.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  } else {
    sorted.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  // Build depth-capped threads: replies beyond MAX_VISUAL_DEPTH are flattened to depth 3
  function buildThread(
    comment: PostComment,
    depth: number,
    repliedToAuthor: string | null,
  ): CommentThread {
    const directReplies = replyMap.get(comment.id) ?? [];
    const childThreads: CommentThread[] = [];
    const overflowReplies: PostComment[] = [];

    for (const reply of directReplies) {
      if (depth >= MAX_VISUAL_DEPTH) {
        // At max depth — flatten: this reply and all its descendants appear at this level
        overflowReplies.push(reply);
      } else {
        childThreads.push(
          buildThread(reply, depth + 1, comment.authorDisplayName),
        );
      }
    }

    // Overflow replies get a "replied to" label and are flattened
    const flattenedOverflow: CommentThread[] = overflowReplies.map((r) => ({
      ...r,
      replies: [],
      depth: MAX_VISUAL_DEPTH,
      repliedTo: repliedToAuthor ?? comment.authorDisplayName,
    }));

    return {
      ...comment,
      depth,
      replies: [...childThreads, ...flattenedOverflow],
    };
  }

  return sorted.map((c) => buildThread(c, 0, null));
}

function CommentCard({
  comment,
  isReply,
  isSignedIn,
  onLike,
  onDelete,
  onReply,
  replyingTo,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  submittingReply,
  repliedTo,
}: {
  comment: PostComment;
  isReply: boolean;
  isSignedIn: boolean;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (id: string | null) => void;
  replyingTo: string | null;
  replyContent: string;
  onReplyContentChange: (val: string) => void;
  onSubmitReply: (parentId: string) => void;
  submittingReply: boolean;
  repliedTo?: string;
}) {
  const isOpen = replyingTo === comment.id;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteCancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const deleteConfirmId = useId();

  useEffect(() => {
    if (showDeleteConfirm) {
      deleteCancelButtonRef.current?.focus();
    }
  }, [showDeleteConfirm]);

  const isHidden = comment.visibility === "hidden";

  return (
    <article
      className={`rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm sm:p-5 ${isReply ? "ml-6 mt-3 border-l-2 border-l-[var(--primary)]" : ""} ${isHidden ? "opacity-75" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline"
              href={getAuthorHref(comment.authorId)}
            >
              {comment.authorDisplayName}
            </Link>
            {repliedTo ? (
              <span className="text-[var(--text-secondary)]">
                replied to{" "}
                <span className="font-medium text-[var(--text-primary)]">
                  {repliedTo}
                </span>
              </span>
            ) : null}
            <span className="text-[var(--text-secondary)]">
              {formatCommentDate(comment.createdAt)}
            </span>
            {isHidden && (
              <span className="rounded-full bg-[var(--color-warning-soft-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-warning-text)] border border-[var(--color-warning-soft-border)]">
                Hidden
              </span>
            )}
          </div>
          <p
            className={`mt-3 whitespace-pre-wrap text-sm leading-7 ${isHidden ? "italic text-[var(--text-secondary)]" : "text-[var(--text-primary)]"}`}
          >
            {comment.content}
          </p>
        </div>
        {comment.canDelete ? (
          showDeleteConfirm ? (
            <div
              className="flex flex-wrap items-center gap-2 rounded-full border border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] px-3 py-1.5"
              id={deleteConfirmId}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setShowDeleteConfirm(false);
                }
              }}
            >
              <span className="text-xs font-semibold text-[var(--color-error-text)]">
                Delete comment?
              </span>
              <button
                className={`rounded-full px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] ${FOCUS_RING}`}
                onClick={() => setShowDeleteConfirm(false)}
                ref={deleteCancelButtonRef}
                type="button"
              >
                Cancel
              </button>
              <button
                className={`rounded-full bg-[var(--color-error)] px-3 py-1 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:brightness-110 ${FOCUS_RING}`}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete(comment.id);
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          ) : (
            <button
              aria-controls={deleteConfirmId}
              aria-expanded={showDeleteConfirm}
              className={`rounded-full border border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-error-text)] transition-colors hover:brightness-95 ${FOCUS_RING}`}
              onClick={() => setShowDeleteConfirm(true)}
              type="button"
            >
              Delete
            </button>
          )
        ) : null}
      </div>

      {!isHidden && (
        <div className="mt-4 flex items-center gap-3">
          <button
            aria-pressed={comment.userHasLiked}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
              comment.userHasLiked
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)]"
            } ${FOCUS_RING}`}
            onClick={() => onLike(comment.id)}
            type="button"
          >
            <span>{comment.userHasLiked ? "Liked" : "Like"}</span>
            <span>{comment.likeCount}</span>
          </button>

          {!isReply && isSignedIn ? (
            <button
              className={`rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] ${FOCUS_RING}`}
              onClick={() => onReply(isOpen ? null : comment.id)}
              type="button"
            >
              {isOpen ? "Cancel" : "Reply"}
            </button>
          ) : null}
        </div>
      )}

      {isOpen ? (
        <div className="mt-4">
          <textarea
            autoFocus
            className={`w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)]`}
            disabled={submittingReply}
            onChange={(e) => onReplyContentChange(e.target.value)}
            placeholder={`Reply to ${comment.authorDisplayName}…`}
            rows={3}
            value={replyContent}
          />
          <div className="mt-2 flex justify-end">
            <button
              className={`rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-60 ${FOCUS_RING}`}
              disabled={submittingReply || !replyContent.trim()}
              onClick={() => onSubmitReply(comment.id)}
              type="button"
            >
              {submittingReply ? "Posting…" : "Post reply"}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function Comments({ postId }: { postId: string }) {
  const pathname = usePathname();
  const [allComments, setAllComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sortBy, setSortBy] = useState<CommentSortOption>("likes");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { user } = useAuth();
  const isSignedIn = Boolean(user);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const response = await fetch(
        `/api/posts/${postId}/comments?sort=${sortBy}`,
      );
      if (!response.ok) throw new Error("Failed to fetch comments");

      const payload = commentsResponseSchema.parse(await response.json());
      setAllComments(payload.comments ?? []);
    } catch {
      setFetchError("Comments could not be loaded right now.");
    } finally {
      setLoading(false);
    }
  }, [postId, sortBy]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchComments setState happens async after await, not cascading
    void fetchComments();
  }, [fetchComments]);

  async function handleSubmitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!response.ok) throw new Error("Failed to post comment");

      const payload = commentsResponseSchema.parse(await response.json());
      const mutationResult = resolveCommentMutationComments(
        allComments,
        payload.comments,
      );
      setAllComments(mutationResult.comments);
      if (mutationResult.shouldRefetch) {
        await fetchComments();
      }
      setNewComment("");
      setSortBy("newest");
    } catch {
      setError("Comment could not be posted.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitReply(parentId: string) {
    if (!user || !replyContent.trim()) return;

    setSubmittingReply(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent.trim(), parentId }),
      });

      if (!response.ok) throw new Error("Failed to post reply");

      const payload = commentsResponseSchema.parse(await response.json());
      const mutationResult = resolveCommentMutationComments(
        allComments,
        payload.comments,
      );
      setAllComments(mutationResult.comments);
      if (mutationResult.shouldRefetch) {
        await fetchComments();
      }
      setReplyContent("");
      setReplyingTo(null);
    } catch {
      setError("Reply could not be posted.");
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleLikeComment(commentId: string) {
    if (!user) {
      setError("Sign in to like comments.");
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to toggle like");
      await fetchComments();
    } catch {
      setError("Like could not be updated.");
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!user) return;

    setError(null);
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete comment");
      await fetchComments();
    } catch {
      setError("Comment could not be deleted.");
    }
  }

  const threads = useMemo(
    () => buildThreads(allComments, sortBy),
    [allComments, sortBy],
  );
  const topLevelCount = threads.length;
  const totalCount = allComments.filter(
    (c) => c.visibility === "visible",
  ).length;

  return (
    <section
      className="comments-section mt-12 border-t border-[var(--border)] pt-8"
      data-print-hide
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
          Comments ({totalCount})
        </h2>
        <div className="flex flex-wrap gap-2">
          {COMMENT_SORT_OPTIONS.map((option) => (
            <button
              aria-pressed={sortBy === option}
              key={option}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                sortBy === option
                  ? "bg-[var(--primary)] text-[var(--on-primary)]"
                  : "border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-secondary)]"
              } ${FOCUS_RING}`}
              onClick={() => setSortBy(option)}
              type="button"
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isSignedIn ? (
        <form className="mt-6" onSubmit={handleSubmitComment}>
          <textarea
            aria-describedby={error ? "comments-error" : undefined}
            aria-invalid={
              error === "Comment could not be posted." ? true : undefined
            }
            className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[var(--text-primary)] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]`}
            disabled={submitting}
            onChange={(event) => setNewComment(event.target.value)}
            placeholder="Share your thoughts..."
            rows={4}
            value={newComment}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <a
              className={`text-xs text-[var(--text-secondary)] underline-offset-2 hover:underline ${FOCUS_RING}`}
              href="/api/auth/logout"
            >
              Sign out
            </a>
            <button
              className={`rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-60 ${FOCUS_RING}`}
              disabled={submitting || !newComment.trim()}
              type="submit"
            >
              {submitting ? "Posting..." : "Post comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-5 py-4">
          <p className="flex-1 text-sm leading-7 text-[var(--text-secondary)]">
            Sign in to join the conversation.
          </p>
          <div className="flex shrink-0 gap-2">
            <Link
              className={`rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] ${FOCUS_RING}`}
              href={{
                pathname: "/login",
                query: { redirectTo: pathname ?? "/" },
              }}
            >
              Sign in
            </Link>
            <Link
              className={`rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] ${FOCUS_RING}`}
              href={{
                pathname: "/signup",
                query: { redirectTo: pathname ?? "/" },
              }}
            >
              Create account
            </Link>
          </div>
        </div>
      )}

      {fetchError ? (
        <div
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] px-4 py-3 text-sm text-[var(--color-error-text)]"
          id="comments-load-error"
          role="alert"
        >
          <span>{fetchError}</span>
          <button
            className={`rounded-full border border-[var(--color-error-soft-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-error-text)] ${FOCUS_RING}`}
            onClick={() => void fetchComments()}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}

      {error ? (
        <div
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] px-4 py-3 text-sm text-[var(--color-error-text)]"
          id="comments-error"
          role="alert"
        >
          <span>{error}</span>
          {error === "Comment could not be posted." ||
          error === "Reply could not be posted." ? (
            <button
              className={`rounded-full border border-[var(--color-error-soft-border)] bg-[var(--card-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-error-text)] ${FOCUS_RING}`}
              onClick={() => setError(null)}
              type="button"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--spinner)]" />
        </div>
      ) : fetchError ? null : topLevelCount === 0 ? (
        <div className="py-12 text-center text-[var(--text-secondary)]">
          <p>No comments yet. Be the first to add one.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {threads.map((thread) => (
            <div key={thread.id}>
              <CommentCard
                isSignedIn={isSignedIn}
                comment={thread}
                isReply={false}
                onDelete={(id) => void handleDeleteComment(id)}
                onLike={(id) => void handleLikeComment(id)}
                onReply={setReplyingTo}
                onReplyContentChange={setReplyContent}
                onSubmitReply={(parentId) => void handleSubmitReply(parentId)}
                replyContent={replyContent}
                replyingTo={replyingTo}
                submittingReply={submittingReply}
              />
              {thread.replies.map((reply) => (
                <CommentCard
                  key={reply.id}
                  isSignedIn={isSignedIn}
                  comment={reply}
                  isReply
                  onDelete={(id) => void handleDeleteComment(id)}
                  onLike={(id) => void handleLikeComment(id)}
                  onReply={setReplyingTo}
                  onReplyContentChange={setReplyContent}
                  onSubmitReply={(parentId) => void handleSubmitReply(parentId)}
                  repliedTo={thread.authorDisplayName}
                  replyContent={replyContent}
                  replyingTo={replyingTo}
                  submittingReply={submittingReply}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
