"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { AdminCommentCard } from "./admin-comment-card";
import type { CommentModerationAction, CommentVisibility } from "@/server/forms/comments";

export type AdminCommentSortOption = "likes" | "newest" | "oldest";

const ADMIN_COMMENT_SORT_OPTIONS: AdminCommentSortOption[] = ["newest", "oldest", "likes"];

export type AdminCommentDTO = {
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
  visibility: CommentVisibility;
  isFlagged: boolean;
  moderatedAt: string | null;
  moderatedByUserId: string | null;
  canLike: boolean;
};

const AdminCommentSchema = z.object({
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
  isFlagged: z.boolean(),
  moderatedAt: z.string().nullable(),
  moderatedByUserId: z.string().nullable(),
  canLike: z.boolean(),
});

const CommentsResponseSchema = z.object({
  comments: z.array(AdminCommentSchema),
});

const ModerateResponseSchema = z.object({
  action: z.enum(["hide", "unhide", "delete", "flag", "unflag"]),
  updatedCount: z.number(),
  unchangedCount: z.number(),
  missingIds: z.array(z.string()),
  comments: z.array(
    z.object({
      commentId: z.string(),
      postId: z.string(),
      visibility: z.enum(["visible", "hidden", "deleted"]),
      isFlagged: z.boolean(),
      moderatedAt: z.string().nullable(),
      moderatedByUserId: z.string().nullable(),
      changed: z.boolean(),
    }),
  ),
});

export type AdminCommentThread = AdminCommentDTO & { replies: AdminCommentDTO[] };

type CommentSummaryStat = {
  label: string;
  value: number;
  tone: "default" | "warning" | "info" | "error";
};

function getOptimisticComment(
  comment: AdminCommentDTO,
  action: CommentModerationAction,
): AdminCommentDTO {
  if (action === "hide") {
    return { ...comment, visibility: "hidden", isFlagged: false };
  }

  if (action === "unhide") {
    return { ...comment, visibility: "visible" };
  }

  if (action === "delete") {
    return { ...comment, visibility: "deleted", isFlagged: false };
  }

  if (action === "flag") {
    return { ...comment, isFlagged: true };
  }

  return { ...comment, isFlagged: false };
}

function buildThreads(flat: AdminCommentDTO[], sortBy: AdminCommentSortOption): AdminCommentThread[] {
  const topLevel = flat.filter((c) => !c.parentId);
  const replyMap = new Map<string, AdminCommentDTO[]>();

  for (const c of flat) {
    if (c.parentId) {
      const existing = replyMap.get(c.parentId) ?? [];
      replyMap.set(c.parentId, [...existing, c]);
    }
  }

  // Sort replies oldest-first always — create sorted copies in place
  for (const [parentId, replies] of replyMap) {
    replyMap.set(parentId, [...replies].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
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
    // newest
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return sorted.map((c) => ({ ...c, replies: replyMap.get(c.id) ?? [] }));
}

export function AdminCommentsPanel({ postId }: { postId: string }) {
  const [comments, setComments] = useState<AdminCommentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<AdminCommentSortOption>("newest");
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchComments = useCallback(async (preserveExisting: boolean) => {
    if (preserveExisting) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const searchParams = new URLSearchParams({ sort: sortBy });
      const resp = await fetch(`/api/admin/posts/${encodeURIComponent(postId)}/comments?${searchParams.toString()}`);
      if (!resp.ok) {
        throw new Error("Failed to load admin comments");
      }
      const json = await resp.json();
      const data = CommentsResponseSchema.parse(json);
      setComments(data.comments);
    } catch {
      setError("Failed to load comments.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      hasLoadedRef.current = true;
    }
  }, [postId, sortBy]);

  useEffect(() => {
    void fetchComments(hasLoadedRef.current);
  }, [fetchComments]);

  const handleModerate = async (commentId: string, action: CommentModerationAction) => {
    const previousComment = comments.find((comment) => comment.id === commentId) ?? null;

    if (!previousComment) {
      throw new Error("Comment not found");
    }

    setComments((current) =>
      current.map((comment) => {
        if (comment.id !== commentId) {
          return comment;
        }

        return getOptimisticComment(comment, action);
      }),
    );

    try {
      const response = await fetch("/api/admin/comments/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentIds: [commentId], action }),
      });

      if (!response.ok) {
        throw new Error("Failed to moderate comment");
      }

      const json = await response.json();
      const result = ModerateResponseSchema.parse(json);

      if (result.missingIds.includes(commentId)) {
        throw new Error("Comment no longer exists");
      }

      const updatedComment = result.comments.find((comment) => comment.commentId === commentId);
      if (!updatedComment) {
        throw new Error("Moderation response was incomplete");
      }

      setComments((current) =>
        current.map((comment) => {
          if (comment.id !== updatedComment.commentId) {
            return comment;
          }

          return {
            ...comment,
            visibility: updatedComment.visibility,
            isFlagged: updatedComment.isFlagged,
            moderatedAt: updatedComment.moderatedAt,
            moderatedByUserId: updatedComment.moderatedByUserId,
          };
        }),
      );
    } catch (error) {
      setComments((current) =>
        current.map((comment) => {
          if (comment.id !== commentId) {
            return comment;
          }

          return previousComment;
        }),
      );
      throw error;
    }
  };

  const threads = useMemo(() => buildThreads(comments, sortBy), [comments, sortBy]);
  const summaryStats = useMemo<CommentSummaryStat[]>(() => {
    const topLevelCount = comments.filter((comment) => comment.parentId === null).length;
    const hiddenCount = comments.filter((comment) => comment.visibility === "hidden").length;
    const deletedCount = comments.filter((comment) => comment.visibility === "deleted").length;
    const flaggedCount = comments.filter((comment) => comment.isFlagged).length;

    return [
      { label: "Total", value: comments.length, tone: "default" },
      { label: "Threads", value: topLevelCount, tone: "default" },
      { label: "Flagged", value: flaggedCount, tone: "info" },
      { label: "Hidden", value: hiddenCount, tone: "warning" },
      { label: "Deleted", value: deletedCount, tone: "error" },
    ];
  }, [comments]);

  if (loading && comments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 sm:p-6">
          <div className="h-4 w-28 rounded-full bg-[var(--accent-soft)]" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
                <div className="h-3 w-16 rounded-full bg-[var(--surface-strong)]" />
                <div className="mt-3 h-7 w-10 rounded-full bg-[var(--surface-strong)]" />
              </div>
            ))}
          </div>
        </div>

        {[0, 1, 2].map((item) => (
          <div key={item} className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-4 w-28 rounded-full bg-[var(--surface-strong)]" />
              <div className="h-4 w-20 rounded-full bg-[var(--surface-strong)]" />
              <div className="h-5 w-16 rounded-full bg-[var(--surface-strong)]" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-4 w-full rounded-full bg-[var(--surface-strong)]" />
              <div className="h-4 w-[88%] rounded-full bg-[var(--surface-strong)]" />
              <div className="h-4 w-[72%] rounded-full bg-[var(--surface-strong)]" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
              <div className="h-9 w-24 rounded-full bg-[var(--surface-strong)]" />
              <div className="h-9 w-24 rounded-full bg-[var(--surface-strong)]" />
              <div className="h-9 w-24 rounded-full bg-[var(--surface-strong)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">Thread review</p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              Review the full conversation in place. Hidden and deleted comments stay visible here so moderation decisions keep their original context.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isRefreshing ? (
              <span className="rounded-full border border-[var(--color-info-soft-border)] bg-[var(--color-info-soft-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-info-text)]">
                Refreshing
              </span>
            ) : null}
            <span className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Sort by
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5">
            {summaryStats.map((stat) => {
              const toneClasses =
                stat.tone === "warning"
                  ? "border-[var(--color-warning-soft-border)] bg-[var(--color-warning-soft-bg)] text-[var(--color-warning-text)]"
                  : stat.tone === "info"
                    ? "border-[var(--color-info-soft-border)] bg-[var(--color-info-soft-bg)] text-[var(--color-info-text)]"
                    : stat.tone === "error"
                      ? "border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] text-[var(--color-error-text)]"
                      : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]";

              return (
                <div key={stat.label} className={`rounded-2xl border px-4 py-3 ${toneClasses}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            {ADMIN_COMMENT_SORT_OPTIONS.map((option) => (
              <button
                key={option}
                aria-pressed={sortBy === option}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50 ${
                  sortBy === option
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                }`}
                onClick={() => setSortBy(option)}
                type="button"
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] px-4 py-3 text-sm text-[var(--color-error-text)]">
          <span>{error}</span>
          <button
            className="rounded-full border border-[var(--color-error-soft-border)] px-3 py-1 font-semibold transition-opacity hover:opacity-85"
            onClick={() => void fetchComments(comments.length > 0)}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

      {threads.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] py-12 text-center text-[var(--text-secondary)]">
          No comments have been posted on this story.
        </div>
      ) : (
        <div
          aria-busy={isRefreshing}
          className={`space-y-8 transition-opacity duration-300 ${isRefreshing ? "pointer-events-none opacity-70" : ""}`}
        >
          {threads.map((thread) => (
            <div key={thread.id} className="space-y-4">
              <AdminCommentCard
                comment={thread}
                isReply={false}
                onModerate={handleModerate}
              />
              {thread.replies.map((reply) => (
                <AdminCommentCard
                  key={reply.id}
                  comment={reply}
                  isReply
                  onModerate={handleModerate}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
