"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import type { AdminSession } from "@/lib/auth/session";
import {
  bulkDeletePosts,
  bulkPublishPosts,
  bulkUnpublishPosts,
  clonePost,
  createPostPreviewLinkAction,
  deletePostAction,
} from "@/app/admin/actions";
import { formatPublishedDate, getPostHref } from "@/lib/utils";
import type { AdminPostRecord, AdminPostListResult, AdminCategoryRecord } from "@/server/dal/admin-posts";
import type { PostPublishResult } from "@/server/posts/publish";
import { ThemeSelect } from "@/components/ui/theme-select";

function getStatusStyles(status: AdminPostRecord["status"]) {
  switch (status) {
    case "published":
      return "bg-[var(--primary-soft)] text-[var(--primary)]";
    case "scheduled":
      return "bg-[var(--accent-soft)] text-[var(--accent)]";
    default:
      return "bg-[var(--surface-strong)] text-[var(--text-secondary)]";
  }
}

function getDashboardRoute(params: URLSearchParams): "/admin" | `/admin?${string}` {
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

function formatBulkResultMessage(result: PostPublishResult): string {
  const actionLabel = result.operation === "publish" ? "Published" : "Moved to draft";
  const parts = [`${actionLabel} ${result.updatedCount} post(s).`];

  if (result.unchangedCount > 0) {
    parts.push(`${result.unchangedCount} already matched the target state.`);
  }

  if (result.missingIds.length > 0) {
    parts.push(`${result.missingIds.length} could not be found.`);
  }

  return parts.join(" ");
}

function clampPageNumber(value: number, totalPages: number): number {
  return Math.min(Math.max(value, 1), totalPages);
}

function parsePageJumpValue(value: string, totalPages: number): number | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number.parseInt(trimmedValue, 10);
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return clampPageNumber(parsedValue, totalPages);
}

function getVisiblePageNumbers(page: number, totalPages: number): number[] {
  const pageNumbers = new Set<number>([1, totalPages, page - 1, page, page + 1]);

  return Array.from(pageNumbers)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);
}

export function AdminDashboard({
  session,
  counts,
  postsResult,
  categories,
}: {
  session: AdminSession;
  counts: { total: number; published: number; draft: number; scheduled: number };
  postsResult: AdminPostListResult;
  categories: AdminCategoryRecord[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(postsResult.filters.query);
  const [pageJumpInput, setPageJumpInput] = useState(String(postsResult.page));
  const [deleteConfirm, setDeleteConfirm] = useState<{ ids: string[]; titles: string[] } | null>(null);

  const posts = postsResult.posts;
  const { page, totalPages, totalCount } = postsResult;
  const activeQuery = postsResult.filters.query;
  const activeStatus = postsResult.filters.status ?? "all";
  const activeCategory = postsResult.filters.category ?? "all";
  const activeSort = postsResult.filters.sort;
  const firstResultIndex = totalCount === 0 ? 0 : (page - 1) * postsResult.pageSize + 1;
  const lastResultIndex = totalCount === 0 ? 0 : firstResultIndex + posts.length - 1;

  useEffect(() => {
    setSearchInput(activeQuery);
  }, [activeQuery]);

  useEffect(() => {
    setPageJumpInput(String(page));
  }, [page]);

  useEffect(() => {
    setSelectedPostIds(new Set());
  }, [page, activeQuery, activeStatus, activeCategory, activeSort]);

  useEffect(() => {
    const trimmedSearch = searchInput.trim();
    if (trimmedSearch === activeQuery) {
      return;
    }

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      } else {
        params.delete("search");
        params.delete("query");
      }
      params.delete("page");
      router.replace(getDashboardRoute(params));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [activeQuery, router, searchInput, searchParams]);

  const selectedPosts = useMemo(
    () => posts.filter((post) => selectedPostIds.has(post.id)),
    [posts, selectedPostIds],
  );

  const allSelected = posts.length > 0 && posts.every((post) => selectedPostIds.has(post.id));
  const isIndeterminate = !allSelected && posts.some((post) => selectedPostIds.has(post.id));

  const hasDrafts = selectedPosts.some((post) => post.status === "draft");
  const hasPublished = selectedPosts.some((post) => post.status === "published");
  const hasScheduled = selectedPosts.some((post) => post.status === "scheduled");
  const visiblePageNumbers = useMemo(() => getVisiblePageNumbers(page, totalPages), [page, totalPages]);

  const togglePost = (id: string) => {
    const next = new Set(selectedPostIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPostIds(next);
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      const next = new Set(selectedPostIds);
      posts.forEach((p: AdminPostRecord) => next.delete(p.id));
      setSelectedPostIds(next);
    } else {
      const next = new Set(selectedPostIds);
      posts.forEach((p: AdminPostRecord) => next.add(p.id));
      setSelectedPostIds(next);
    }
  };

  const updateFilters = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== "all") {
        params.set(key, String(value));
      } else {
        params.delete(key);
        if (key === "search") {
          params.delete("query");
        }
      }
    });

    if (!updates.page) {
      params.delete("page");
    }

    router.push(getDashboardRoute(params));
  };

  const handlePageJump = () => {
    const nextPage = parsePageJumpValue(pageJumpInput, totalPages);
    if (!nextPage || nextPage === page) {
      setPageJumpInput(String(page));
      return;
    }

    updateFilters({ page: nextPage });
  };

  const handleBulkPublish = () => {
    if (selectedPostIds.size === 0) return;
    startTransition(async () => {
      try {
        const result = await bulkPublishPosts(Array.from(selectedPostIds));
        setToastMessage(formatBulkResultMessage(result));
        setSelectedPostIds(new Set());
        setTimeout(() => {
          setToastMessage(null);
        }, 4000);
        router.refresh();
      } catch (err: unknown) {
        console.error("Bulk publish failed:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        setToastMessage(`Failed to publish posts: ${message}`);
        setTimeout(() => {
          setToastMessage(null);
        }, 4000);
      }
    });
  };

  const handleBulkUnpublish = () => {
    if (selectedPostIds.size === 0) return;
    startTransition(async () => {
      try {
        const result = await bulkUnpublishPosts(Array.from(selectedPostIds));
        setToastMessage(formatBulkResultMessage(result));
        setSelectedPostIds(new Set());
        setTimeout(() => {
          setToastMessage(null);
        }, 4000);
        router.refresh();
      } catch (err: unknown) {
        console.error("Bulk unpublish failed:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        setToastMessage(`Failed to unpublish posts: ${message}`);
        setTimeout(() => {
          setToastMessage(null);
        }, 4000);
      }
    });
  };

  const handlePreview = (postId: string) => {
    startTransition(async () => {
      try {
        const result = await createPostPreviewLinkAction(postId);
        window.open(result.previewPath, "_blank", "noopener,noreferrer");
      } catch (err: unknown) {
        console.error("Preview failed:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        setToastMessage(`Failed to create preview: ${message}`);
        setTimeout(() => {
          setToastMessage(null);
        }, 4000);
      }
    });
  };

  const handleClone = (postId: string) => {
    startTransition(async () => {
      try {
        const result = await clonePost(postId);
        setToastMessage("Post cloned as draft");
        setTimeout(() => {
          setToastMessage(null);
        }, 4000);
        router.push(`/admin/posts/${result.postId}/edit?cloned=1`);
      } catch (err: unknown) {
        console.error("Clone failed:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        setToastMessage(`Failed to clone post: ${message}`);
        setTimeout(() => {
          setToastMessage(null);
        }, 4000);
      }
    });
  };

  const promptDeleteSingle = (postId: string, postTitle: string) => {
    setDeleteConfirm({ ids: [postId], titles: [postTitle] });
  };

  const promptDeleteBulk = () => {
    if (selectedPostIds.size === 0) return;
    const titles = posts
      .filter((p: AdminPostRecord) => selectedPostIds.has(p.id))
      .map((p: AdminPostRecord) => p.title);
    setDeleteConfirm({ ids: Array.from(selectedPostIds), titles });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    const idsToDelete = deleteConfirm.ids;
    setDeleteConfirm(null);
    startTransition(async () => {
      try {
        const result = idsToDelete.length === 1
          ? await deletePostAction(idsToDelete[0])
          : await bulkDeletePosts(idsToDelete);
        setToastMessage(`Deleted ${result.deletedCount} post(s).${result.missingIds.length > 0 ? ` ${result.missingIds.length} not found.` : ""}`);
        setSelectedPostIds(new Set());
        setTimeout(() => {
          setToastMessage(null);
        }, 4000);
        router.refresh();
      } catch (err: unknown) {
        console.error("Delete failed:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        setToastMessage(`Failed to delete: ${message}`);
        setTimeout(() => {
          setToastMessage(null);
        }, 4000);
      }
    });
  };

  return (
    <div className="mt-10 space-y-8">
      {/* Delete confirmation dialog */}
      {deleteConfirm ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Confirm delete">
          <div className="mx-4 w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Delete {deleteConfirm.ids.length === 1 ? "post" : `${deleteConfirm.ids.length} posts`}?
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              This will permanently delete {deleteConfirm.ids.length === 1 ? "this post" : "these posts"} and all associated comments, images, bookmarks, and revisions. This cannot be undone.
            </p>
            {deleteConfirm.titles.length <= 5 ? (
              <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
                {deleteConfirm.titles.map((title, i) => (
                  <li key={deleteConfirm.ids[i]} className="truncate">&bull; {title}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                {deleteConfirm.titles.slice(0, 3).join(", ")} and {deleteConfirm.titles.length - 3} more
              </p>
            )}
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isPending}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Editorial workspace</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
              Welcome back, {session.user?.githubLogin ?? session.user?.email ?? "admin"}.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Start a new story, tighten a draft, or review the publishing queue. The dashboard should help you make progress quickly, not explain the migration to you.
            </p>
          </div>
          <Link
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
            href="/"
          >
            Back to site
          </Link>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_auto] lg:items-start">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.9fr)_repeat(3,minmax(9rem,11rem))] xl:grid-cols-[minmax(0,1.9fr)_repeat(3,minmax(10rem,12rem))]">
            <input
              type="search"
              placeholder="Search posts..."
              aria-label="Search posts"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="min-w-0 rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-shadow sm:col-span-2 lg:col-span-1 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
            />
            <ThemeSelect
              ariaLabel="Filter posts by status"
              value={activeStatus}
              onChange={(value) => updateFilters({ status: value })}
              options={[
                { label: "All Status", value: "all" },
                { label: "Published", value: "published" },
                { label: "Draft", value: "draft" },
                { label: "Scheduled", value: "scheduled" },
              ]}
              className="w-full lg:w-[130px] xl:w-[140px]"
            />
            <ThemeSelect
              ariaLabel="Filter posts by category"
              value={activeCategory}
              onChange={(value) => updateFilters({ category: value })}
              options={[
                { label: "All Categories", value: "all" },
                ...categories.map((cat) => ({ label: cat.name, value: cat.slug })),
              ]}
              className="w-full lg:w-[150px] xl:w-[160px]"
            />
            <ThemeSelect
              ariaLabel="Sort posts"
              value={activeSort}
              onChange={(value) => updateFilters({ sort: value })}
              options={[
                { label: "Newest first", value: "created-desc" },
                { label: "Oldest first", value: "created-asc" },
                { label: "Title A-Z", value: "title-asc" },
                { label: "Recently updated", value: "updated-desc" },
                { label: "Recently published", value: "published-desc" },
                { label: "Most viewed", value: "views-desc" },
              ]}
              className="w-full lg:w-[170px] xl:w-[180px]"
            />
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] shadow-sm transition-colors hover:bg-[var(--primary)]"
              href="/admin/posts/new"
            >
              Create new post
            </Link>
            <Link
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
              href="/admin/tags"
            >
              Manage tags
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total posts", counts.total],
          ["Published", counts.published],
          ["Drafts", counts.draft],
          ["Scheduled", counts.scheduled],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2.3fr)_minmax(22rem,0.95fr)]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Editorial queue</p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">Latest posts in Turso</h3>
            </div>
            <span className="text-sm text-[var(--muted)]">
              {totalCount === 0
                ? "No matching entries"
                : `Showing ${firstResultIndex}-${lastResultIndex} of ${totalCount}`}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {selectedPostIds.size > 0 ? (
              <div className="fixed bottom-6 left-6 right-6 z-50 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--foreground)] px-5 py-3 text-[var(--background)] shadow-2xl sm:left-auto sm:right-6 sm:w-auto">
                <span className="text-sm font-semibold">
                  {selectedPostIds.size} selected
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBulkPublish}
                    disabled={isPending}
                    className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-light)] disabled:opacity-50"
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkUnpublish}
                    disabled={isPending}
                    className="rounded-full bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)] disabled:opacity-50"
                  >
                    Unpublish
                  </button>
                  <button
                    type="button"
                    onClick={promptDeleteBulk}
                    disabled={isPending}
                    className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPostIds(new Set())}
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)]"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            ) : null}

            {posts.length === 0 ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center">
                <p className="text-[var(--text-secondary)]">
                  {activeQuery || activeStatus !== "all" || activeCategory !== "all"
                    ? "No posts match the current filters. Try widening the search or clearing a filter."
                    : "No posts have been created yet."}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] p-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = isIndeterminate;
                      }
                    }}
                    onChange={toggleSelectAll}
                    disabled={isPending}
                    className="h-5 w-5 cursor-pointer rounded border-[var(--border)] accent-[var(--accent)]"
                    aria-label="Select all posts on this page"
                  />
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {allSelected ? "Deselect all on page" : "Select all on page"}
                  </span>
                </div>

                  {posts.map((post: AdminPostRecord) => (
                  <article
                      key={post.id}
                      className="flex gap-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 sm:p-5 lg:p-6"
                      data-post-id={post.id}
                      data-post-status={post.status}
                      data-testid="admin-post-row"
                    >
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedPostIds.has(post.id)}
                        onChange={() => togglePost(post.id)}
                        disabled={isPending}
                        className="h-5 w-5 cursor-pointer rounded border-[var(--border)] accent-[var(--accent)]"
                        aria-label={`Select ${post.title}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getStatusStyles(
                                post.status
                              )}`}
                            >
                              {post.status}
                            </span>
                            {post.category ? (
                              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                                {post.category}
                              </span>
                            ) : null}
                          </div>
                           <h4 className="mt-3 text-lg font-semibold text-[var(--foreground)] sm:text-xl" data-testid="admin-post-title">
                             {post.title}
                           </h4>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                            {post.excerpt ||
                              "This post is synced into Turso and ready for native admin tooling."}
                          </p>
                        </div>
                        <div className="w-full text-left text-xs uppercase tracking-[0.16em] text-[var(--muted)] sm:w-auto sm:text-right">
                          <p>Created</p>
                          <p className="mt-1 text-sm normal-case tracking-normal text-[var(--foreground)]">
                            {formatPublishedDate(post.createdAt.toISOString())}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 border-t border-[var(--border)] pt-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                        <div className="space-y-2 text-sm text-[var(--muted)]">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Publishing timeline</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {post.publishedAt ? (
                            <span>
                              Published {formatPublishedDate(post.publishedAt.toISOString())}
                            </span>
                          ) : null}
                          {post.scheduledPublishTime ? (
                            <span>
                              Scheduled {formatPublishedDate(post.scheduledPublishTime.toISOString())}
                            </span>
                          ) : null}
                          <span>{post.viewCount} views</span>
                          </div>
                        </div>
                        <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end pt-3 xl:pt-0">
                            <button
                               type="button"
                               onClick={() => handleClone(post.id)}
                              disabled={isPending}
                              data-testid="admin-post-clone"
                               className="rounded-full border border-[var(--border)] px-3 py-2 text-center font-semibold text-[var(--accent)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
                             >
                              Clone
                            </button>
                            <Link
                              className="rounded-full border border-[var(--border)] px-3 py-2 text-center font-semibold text-[var(--accent)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                              href={`/admin/posts/${post.id}/edit`}
                            >
                              Edit
                            </Link>
                            <Link
                              className="rounded-full border border-[var(--border)] px-3 py-2 text-center font-semibold text-[var(--accent)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                              href={`/admin/posts/${post.id}/comments`}
                            >
                              Moderate comments
                           </Link>
                           {post.status === "published" ? (
                             <Link
                                className="rounded-full border border-[var(--border)] px-3 py-2 text-center font-semibold text-[var(--accent)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                                href={getPostHref({ id: post.id, title: post.title, slug: post.slug })}
                              >
                                View live
                            </Link>
                          ) : (
                            <button
                              type="button"
                               onClick={() => handlePreview(post.id)}
                               disabled={isPending}
                               data-testid="admin-post-preview"
                                className="rounded-full border border-[var(--border)] px-3 py-2 text-center font-semibold text-[var(--accent)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
                              >
                                Preview
                              </button>
                          )}
                            <button
                              type="button"
                              onClick={() => promptDeleteSingle(post.id, post.title)}
                              disabled={isPending}
                              data-testid="admin-post-delete"
                              className="admin-delete-btn rounded-full border px-3 py-2 text-center font-semibold transition-colors disabled:opacity-50"
                            >
                              Delete
                            </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                <div className="flex flex-col gap-5 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-sm text-[var(--text-secondary)] 2xl:flex-row 2xl:flex-wrap 2xl:items-center 2xl:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {visiblePageNumbers.map((pageNumber, index) => (
                        <div key={pageNumber} className="flex items-center gap-2">
                          {index > 0 && visiblePageNumbers[index - 1] !== pageNumber - 1 ? (
                            <span aria-hidden="true" className="text-[var(--muted)]">
                              ...
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => updateFilters({ page: pageNumber })}
                            disabled={pageNumber === page}
                            className={`rounded-full border px-3 py-1.5 font-semibold transition-colors ${
                              pageNumber === page
                                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]"
                                : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--accent-soft)]"
                            } disabled:cursor-default disabled:opacity-100`}
                            aria-current={pageNumber === page ? "page" : undefined}
                            aria-label={`Go to page ${pageNumber}`}
                          >
                            {pageNumber}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 2xl:justify-end">
                    <div className="flex items-center gap-2 rounded-full border border-[var(--border)] px-2 py-1">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]" htmlFor="admin-page-jump">
                        Jump
                      </label>
                      <input
                        id="admin-page-jump"
                        type="number"
                        min={1}
                        max={totalPages}
                        inputMode="numeric"
                        value={pageJumpInput}
                        onChange={(event) => setPageJumpInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handlePageJump();
                          }
                        }}
                        className="w-16 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-center text-sm text-[var(--foreground)]"
                        aria-label="Jump to page"
                      />
                      <button
                        type="button"
                        onClick={handlePageJump}
                        className="rounded-full border border-[var(--border)] px-3 py-1.5 font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)]"
                      >
                        Go
                      </button>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-[var(--border)] p-1">
                      {[12, 24, 48].map((size) => {
                        const isActiveSize = postsResult.pageSize === size;

                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => updateFilters({ pageSize: size, page: 1 })}
                            className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${
                              isActiveSize
                                ? "bg-[var(--primary)] text-[var(--on-primary)]"
                                : "text-[var(--foreground)] hover:bg-[var(--accent-soft)]"
                            }`}
                            aria-pressed={isActiveSize}
                            aria-label={`Show ${size} posts per page`}
                          >
                            {size}/page
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateFilters({ page: page - 1 })}
                      disabled={page <= 1}
                      className="rounded-full border border-[var(--border)] px-4 py-2 font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => updateFilters({ page: page + 1 })}
                      disabled={page >= totalPages}
                      className="rounded-full border border-[var(--border)] px-4 py-2 font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Operational notes</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
              <li>GitHub admin access is locked to your numeric allowlist.</li>
              <li>Cloudinary uploads now feed the native editor directly.</li>
              <li>Turso remains the working source for the new Next.js surface.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Editorial priorities</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
              <li>Review newly created posts for category and layout quality.</li>
              <li>Use tags and featured imagery to strengthen discovery.</li>
              <li>Keep scheduled pieces clearly dated before publishing.</li>
            </ul>
          </div>
        </aside>
      </section>

      {toastMessage ? (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--foreground)] px-5 py-3 text-[var(--background)] shadow-2xl"
          role="status"
        >
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            type="button"
            onClick={() => { setToastMessage(null); }}
            className="text-[var(--background)] opacity-70 transition-opacity hover:opacity-100"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
      ) : null}
    </div>
  );
}
