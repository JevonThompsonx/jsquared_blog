"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { z } from "zod";

import { getAuthorHref } from "@/lib/utils";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { resolveCommentMutationComments } from "@/lib/comment-mutation-response";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type CommentSortOption = "likes" | "newest" | "oldest";
const COMMENT_SORT_OPTIONS: readonly CommentSortOption[] = ["likes", "newest", "oldest"];

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

type CommentThread = PostComment & { replies: PostComment[] };

function formatCommentDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function buildThreads(flat: PostComment[], sortBy: CommentSortOption): CommentThread[] {
  const visibleFlat = flat.filter((c) => c.visibility === "visible" || c.visibility === "hidden");
  const topLevel = visibleFlat.filter((c) => !c.parentId);
  const replyMap = new Map<string, PostComment[]>();

  for (const c of visibleFlat) {
    if (c.parentId) {
      const existing = replyMap.get(c.parentId) ?? [];
      existing.push(c);
      replyMap.set(c.parentId, existing);
    }
  }

  // Sort replies oldest-first always
  for (const replies of replyMap.values()) {
    replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  // Sort top-level by the selected option
  const sorted = [...topLevel];
  if (sortBy === "likes") {
    sorted.sort((a, b) => {
      if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else if (sortBy === "oldest") {
    sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else {
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return sorted.map((c) => ({ ...c, replies: replyMap.get(c.id) ?? [] }));
}

function CommentCard({
  comment,
  isReply,
  accessToken,
  onLike,
  onDelete,
  onReply,
  replyingTo,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  submittingReply,
}: {
  comment: PostComment;
  isReply: boolean;
  accessToken: string | null;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (id: string | null) => void;
  replyingTo: string | null;
  replyContent: string;
  onReplyContentChange: (val: string) => void;
  onSubmitReply: (parentId: string) => void;
  submittingReply: boolean;
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
    <article className={`rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm sm:p-5 ${isReply ? "ml-6 mt-3 border-l-2 border-l-[var(--primary)]" : ""} ${isHidden ? "opacity-75" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline" href={getAuthorHref(comment.authorId)}>
              {comment.authorDisplayName}
            </Link>
            <span className="text-[var(--text-secondary)]">{formatCommentDate(comment.createdAt)}</span>
            {isHidden && (
              <span className="rounded-full bg-[var(--color-warning-soft-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-warning-text)] border border-[var(--color-warning-soft-border)]">
                Hidden
              </span>
            )}
          </div>
          <p className={`mt-3 whitespace-pre-wrap text-sm leading-7 ${isHidden ? "italic text-[var(--text-secondary)]" : "text-[var(--text-primary)]"}`}>
            {comment.content}
          </p>
        </div>
        {comment.canDelete ? showDeleteConfirm ? (
          <div
            className="flex flex-wrap items-center gap-2 rounded-full border border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] px-3 py-1.5"
            id={deleteConfirmId}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setShowDeleteConfirm(false);
              }
            }}
          >
            <span className="text-xs font-semibold text-[var(--color-error-text)]">Delete comment?</span>
            <button
              className="rounded-full px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              onClick={() => setShowDeleteConfirm(false)}
              ref={deleteCancelButtonRef}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-full bg-[var(--color-error)] px-3 py-1 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:brightness-110"
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
            className="rounded-full border border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-error-text)] transition-colors hover:brightness-95"
            onClick={() => setShowDeleteConfirm(true)}
            type="button"
          >
            Delete
          </button>
        ) : null}
      </div>

      {!isHidden && (
        <div className="mt-4 flex items-center gap-3">
          <button
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
              comment.userHasLiked
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)]"
            }`}
            onClick={() => onLike(comment.id)}
            type="button"
          >
            <span>{comment.userHasLiked ? "Liked" : "Like"}</span>
            <span>{comment.likeCount}</span>
          </button>

          {!isReply && accessToken ? (
            <button
              className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
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
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            disabled={submittingReply}
            onChange={(e) => onReplyContentChange(e.target.value)}
            placeholder={`Reply to ${comment.authorDisplayName}…`}
            rows={3}
            value={replyContent}
          />
          <div className="mt-2 flex justify-end">
            <button
              className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-60"
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
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const accessToken = session?.access_token ?? null;

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session ?? null);
    });

    const subscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.data.subscription.unsubscribe();
    };
  }, [supabase]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = new Headers();
      if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

      const response = await fetch(`/api/posts/${postId}/comments?sort=${sortBy}`, { headers });
      if (!response.ok) throw new Error("Failed to fetch comments");

      const payload = commentsResponseSchema.parse(await response.json());
      setAllComments(payload.comments ?? []);
    } catch {
      setError("Comments could not be loaded right now.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, postId, sortBy]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  async function handleSubmitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !newComment.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!response.ok) throw new Error("Failed to post comment");

      const payload = commentsResponseSchema.parse(await response.json());
      const mutationResult = resolveCommentMutationComments(allComments, payload.comments);
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
    if (!accessToken || !replyContent.trim()) return;

    setSubmittingReply(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ content: replyContent.trim(), parentId }),
      });

      if (!response.ok) throw new Error("Failed to post reply");

      const payload = commentsResponseSchema.parse(await response.json());
      const mutationResult = resolveCommentMutationComments(allComments, payload.comments);
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
    if (!accessToken) {
      setError("Sign in to like comments.");
      return;
    }

    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error("Failed to toggle like");
      await fetchComments();
    } catch {
      setError("Like could not be updated.");
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!accessToken) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error("Failed to delete comment");
      await fetchComments();
    } catch {
      setError("Comment could not be deleted.");
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
  }

  const threads = useMemo(() => buildThreads(allComments, sortBy), [allComments, sortBy]);
  const topLevelCount = threads.length;
  const totalCount = allComments.filter((c) => c.visibility === "visible").length;

  return (
    <section className="mt-12 border-t border-[var(--border)] pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
          Comments ({totalCount})
        </h2>
        <div className="flex flex-wrap gap-2">
          {COMMENT_SORT_OPTIONS.map((option) => (
            <button
              key={option}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                sortBy === option
                  ? "bg-[var(--primary)] text-[var(--on-primary)]"
                  : "border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-secondary)]"
              }`}
              onClick={() => setSortBy(option)}
              type="button"
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {accessToken ? (
        <form className="mt-6" onSubmit={handleSubmitComment}>
          <textarea
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[var(--text-primary)] shadow-sm focus:outline-none"
            disabled={submitting}
            onChange={(event) => setNewComment(event.target.value)}
            placeholder="Share your thoughts..."
            rows={4}
            value={newComment}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              className="text-xs text-[var(--text-secondary)] underline-offset-2 hover:underline disabled:opacity-50"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
              type="button"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
            <button
              className="rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-60"
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
              className="rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
              href={{ pathname: "/login", query: { redirectTo: pathname ?? "/" } }}
            >
              Sign in
            </Link>
            <Link
              className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)]"
              href={{ pathname: "/signup", query: { redirectTo: pathname ?? "/" } }}
            >
              Create account
            </Link>
          </div>
        </div>
      )}

      {error ? <div className="mt-4 rounded-xl border border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] px-4 py-3 text-sm text-[var(--color-error-text)]">{error}</div> : null}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--spinner)]" />
        </div>
      ) : topLevelCount === 0 ? (
        <div className="py-12 text-center text-[var(--text-secondary)]">
          <p>No comments yet. Be the first to add one.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {threads.map((thread) => (
            <div key={thread.id}>
              <CommentCard
                accessToken={accessToken}
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
                  accessToken={accessToken}
                  comment={reply}
                  isReply
                  onDelete={(id) => void handleDeleteComment(id)}
                  onLike={(id) => void handleLikeComment(id)}
                  onReply={setReplyingTo}
                  onReplyContentChange={setReplyContent}
                  onSubmitReply={(parentId) => void handleSubmitReply(parentId)}
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
