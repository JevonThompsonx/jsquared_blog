"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import type { AdminCommentDTO } from "./admin-comments-panel";
import { getAuthorHref } from "@/lib/utils";
import type { CommentModerationAction } from "@/server/forms/comments";

function formatCommentDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}

export function AdminCommentCard({
  comment,
  isReply,
  onModerate,
}: {
  comment: AdminCommentDTO;
  isReply: boolean;
  onModerate: (commentId: string, action: CommentModerationAction) => Promise<void>;
}) {
  const [processingAction, setProcessingAction] = useState<CommentModerationAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteCancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const deleteConfirmId = useId();

  useEffect(() => {
    if (showDeleteConfirm) {
      deleteCancelButtonRef.current?.focus();
    }
  }, [showDeleteConfirm]);

  const handleAction = async (action: CommentModerationAction) => {
    setProcessingAction(action);
    setActionError(null);

    try {
      await onModerate(comment.id, action);
    } catch {
      setActionError("Action failed. Please try again.");
    } finally {
      setProcessingAction(null);
    }
  };

  const isDeleted = comment.visibility === "deleted";
  const isHidden = comment.visibility === "hidden";
  const statusText = isDeleted ? "Deleted" : isHidden ? "Hidden" : "Visible";
  const cardToneClass = isDeleted
    ? "border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)]"
    : isHidden
      ? "border-[var(--color-warning-soft-border)] bg-[var(--color-warning-soft-bg)]"
      : "border-[var(--border)] bg-[var(--card-bg)]";

  let statusBadge = null;
  if (isDeleted) {
    statusBadge = (
      <span className="rounded bg-[var(--color-error-soft-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--color-error-text)]">
        Deleted
      </span>
    );
  } else if (isHidden) {
    statusBadge = (
      <span className="rounded bg-[var(--color-warning-soft-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--color-warning-text)]">
        Hidden
      </span>
    );
  } else {
    statusBadge = (
      <span className="rounded bg-[var(--color-success-soft-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--color-success-text)]">
        Visible
      </span>
    );
  }

  return (
    <article
      aria-busy={processingAction !== null}
      className={`rounded-2xl border p-5 shadow-sm transition-opacity sm:p-6 lg:p-7 ${cardToneClass} ${
        isReply ? "ml-4 mt-4 md:ml-12 xl:ml-16 border-l-4" : ""
      } ${isDeleted ? "opacity-75" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              className="text-base font-semibold text-[var(--foreground)] hover:text-[var(--primary)] hover:underline"
              href={getAuthorHref(comment.authorId)}
            >
              {comment.authorDisplayName}
            </Link>
            <span className="text-sm text-[var(--text-secondary)]">{formatCommentDate(comment.createdAt)}</span>
            {comment.parentId ? (
              <span className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Reply
              </span>
            ) : null}
            <div aria-live="polite" className="flex flex-wrap items-center gap-2">
              {statusBadge}
              {comment.isFlagged ? (
                <span className="rounded bg-[var(--color-info-soft-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--color-info-text)]">
                  Flagged
                </span>
              ) : null}
            </div>
          </div>

          <p
            className={`mt-3 whitespace-pre-wrap text-base leading-relaxed sm:text-lg sm:leading-8 ${
              isDeleted ? "text-[var(--text-secondary)] italic" : "text-[var(--text-primary)]"
            }`}
          >
            {comment.content || (isDeleted ? "[Original content unavailable]" : null)}
          </p>

          {comment.moderatedAt && comment.moderatedByUserId ? (
            <p className="mt-3 text-xs italic text-[var(--muted)]">
              {statusText} by moderator {formatCommentDate(comment.moderatedAt)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-5">
        <span className="mr-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Actions</span>
        <button
          className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50 disabled:opacity-50 ${
            comment.isFlagged
              ? "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
              : "border-[var(--color-info-soft-border)] bg-[var(--color-info-soft-bg)] text-[var(--color-info-text)] hover:brightness-95"
          }`}
          disabled={processingAction !== null || isDeleted}
          onClick={() => handleAction(comment.isFlagged ? "unflag" : "flag")}
          type="button"
        >
          {processingAction === "flag" || processingAction === "unflag" ? "Saving..." : comment.isFlagged ? "Unflag" : "Flag"}
        </button>

        {isHidden ? (
          <button
            className="rounded-full border border-[var(--color-warning-soft-border)] bg-[var(--color-warning-soft-bg)] px-4 py-2 text-xs font-semibold text-[var(--color-warning-text)] transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50 disabled:opacity-50"
            disabled={processingAction !== null || isDeleted}
            onClick={() => handleAction("unhide")}
            type="button"
          >
            {processingAction === "unhide" ? "Saving..." : "Unhide"}
          </button>
        ) : (
          <button
            className="rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50 disabled:opacity-50"
            disabled={processingAction !== null || isDeleted}
            onClick={() => handleAction("hide")}
            type="button"
          >
            {processingAction === "hide" ? "Saving..." : "Hide"}
          </button>
        )}

        {showDeleteConfirm ? (
          <div
            className="ml-auto flex flex-wrap items-center gap-2 rounded-full border border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] px-3 py-1.5 sm:px-4 sm:py-1"
            id={deleteConfirmId}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setShowDeleteConfirm(false);
              }
            }}
          >
            <span className="text-xs font-semibold text-[var(--color-error-text)]">Permanently delete?</span>
            <button
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50"
              onClick={() => setShowDeleteConfirm(false)}
              ref={deleteCancelButtonRef}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-full bg-[var(--color-error)] px-3 py-1.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50 disabled:opacity-50"
              disabled={processingAction !== null}
              onClick={() => {
                setShowDeleteConfirm(false);
                void handleAction("delete");
              }}
              type="button"
            >
              {processingAction === "delete" ? "Deleting..." : "Delete"}
            </button>
          </div>
        ) : (
          <button
            aria-controls={deleteConfirmId}
            aria-expanded={showDeleteConfirm}
            className="ml-auto rounded-full border border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] px-4 py-2 text-xs font-semibold text-[var(--color-error-text)] transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50 disabled:opacity-50"
            disabled={processingAction !== null || isDeleted}
            onClick={() => setShowDeleteConfirm(true)}
            type="button"
          >
            {processingAction === "delete" ? "Deleting..." : isDeleted ? "Deleted" : "Delete"}
          </button>
        )}
      </div>

      {actionError ? (
        <div aria-live="polite" className="mt-3 text-sm font-semibold text-[var(--color-error-text)]" role="alert">
          {actionError}
        </div>
      ) : null}
    </article>
  );
}
