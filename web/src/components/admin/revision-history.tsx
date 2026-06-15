"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type PostRevision = {
  id: string;
  revisionNum: number;
  title: string;
  excerpt: string | null;
  layoutType: string | null;
  categoryId: string | null;
  featuredImageId: string | null;
  locationName: string | null;
  savedAt: string;
  label: string | null;
};

type RevisionDetail = PostRevision & {
  contentJson: string;
  categoryName: string | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationZoom: number | null;
  songTitle: string | null;
  songArtist: string | null;
  songUrl: string | null;
};

const LAYOUT_LABELS: Record<string, string> = {
  standard: "Standard",
  "split-horizontal": "Split Horizontal",
  "split-vertical": "Split Vertical",
  hover: "Hover",
};

/** Extract readable plain text from a Tiptap/ProseMirror JSON content tree. */
function extractTextFromTiptapJson(contentJson: string): string {
  try {
    const doc = JSON.parse(contentJson) as { content?: unknown[] };
    const chunks: string[] = [];

    function walk(node: unknown): void {
      if (!node || typeof node !== "object") return;
      const n = node as { type?: string; text?: string; content?: unknown[] };
      if (n.text) {
        chunks.push(n.text);
      }
      if (Array.isArray(n.content)) {
        for (const child of n.content) {
          walk(child);
        }
        // Add a newline after block-level nodes so text reads naturally.
        const blockTypes = new Set(["paragraph", "heading", "bulletList", "orderedList", "listItem", "blockquote", "codeBlock", "horizontalRule"]);
        if (n.type && blockTypes.has(n.type)) {
          chunks.push("\n");
        }
      }
    }

    if (Array.isArray(doc?.content)) {
      for (const node of doc.content) {
        walk(node);
      }
    }

    return chunks.join("").trim().slice(0, 800) || "(no text content)";
  } catch {
    return "(unable to preview content)";
  }
}

function formatLayout(layoutType: string | null): string | null {
  if (!layoutType) return null;
  return LAYOUT_LABELS[layoutType] ?? layoutType;
}

function formatLocation(detail: RevisionDetail): string | null {
  if (!detail.locationName && detail.locationLat == null && detail.locationLng == null) {
    return null;
  }
  if (detail.locationName) {
    return detail.locationName;
  }
  if (detail.locationLat != null && detail.locationLng != null) {
    return `${detail.locationLat.toFixed(4)}, ${detail.locationLng.toFixed(4)}`;
  }
  return null;
}

export function RevisionHistory({ postId }: { postId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [revisions, setRevisions] = useState<PostRevision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<RevisionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show loading indicator before async fetch
    setIsLoading(true);
    fetch(`/api/admin/posts/${postId}/revisions`)
      .then(res => res.json())
      .then(data => {
        if (data.revisions) {
          setRevisions(data.revisions);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [isOpen, postId]);

  async function loadDetail(revisionId: string) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/revisions/${revisionId}`);
      if (!res.ok) throw new Error("Failed to load revision detail");
      const data = await res.json();
      setSelectedRevision(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  }

  function handleRestore(revisionId: string) {
    if (!confirm("Are you sure you want to restore this version? Your current changes will be saved as an undo point.")) return;
    
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/posts/${postId}/revisions/${revisionId}/restore`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to restore");
        setIsOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Restore failed");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-[var(--border)] px-4 py-2 text-center text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--accent-soft)]"
      >
        History
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-[var(--background)] shadow-2xl border border-[var(--border)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Revision History</h2>
              <button onClick={() => setIsOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--foreground)]">Close</button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
              {/* Left panel — revision list */}
              <div className="w-1/3 overflow-y-auto border-r border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-2">
                {isLoading && revisions.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
                ) : !isLoading && revisions.length === 0 ? (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-center">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">No revisions yet</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">Every time you save the post a revision is captured here.</p>
                  </div>
                ) : (
                  revisions.map(rev => {
                    const layoutLabel = formatLayout(rev.layoutType);
                    return (
                      <button
                        key={rev.id}
                        onClick={() => loadDetail(rev.id)}
                        className={`block w-full text-left rounded-lg p-3 text-sm transition-colors ${selectedRevision?.id === rev.id ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--background)] border border-[var(--border)]"}`}
                      >
                        <div className="font-medium">Rev {rev.revisionNum}: {new Date(rev.savedAt).toLocaleString()}</div>
                        <div className="mt-1 truncate opacity-80">{rev.title}</div>
                        <div className="mt-1 flex flex-wrap gap-1 text-xs opacity-80">
                          {layoutLabel && <span className="rounded bg-black/10 px-1.5 py-0.5">{layoutLabel}</span>}
                          {rev.locationName && <span className="rounded bg-black/10 px-1.5 py-0.5 truncate max-w-full">📍 {rev.locationName}</span>}
                        </div>
                        {rev.label && <div className="mt-1 text-xs opacity-70 italic">{rev.label}</div>}
                      </button>
                    );
                  })
                )}
              </div>
              
              {/* Right panel — revision detail */}
              <div className="flex-1 overflow-y-auto p-6">
                {error ? <div className="mb-4 text-red-500">{error}</div> : null}
                {isLoading && selectedRevision === null && revisions.length > 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">Loading revision…</p>
                ) : selectedRevision ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-[var(--foreground)]">{selectedRevision.title}</h3>
                      <button
                        onClick={() => handleRestore(selectedRevision.id)}
                        disabled={isPending}
                        className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-light)] disabled:opacity-50"
                      >
                        {isPending ? "Restoring…" : "Restore this version"}
                      </button>
                    </div>
                    {selectedRevision.excerpt && (
                      <p className="text-sm italic text-[var(--text-secondary)]">{selectedRevision.excerpt}</p>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(() => {
                        const layoutLabel = formatLayout(selectedRevision.layoutType);
                        return layoutLabel ? (
                          <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Layout</p>
                            <p className="text-sm text-[var(--text-primary)]">{layoutLabel}</p>
                          </div>
                        ) : null;
                      })()}
                      {selectedRevision.categoryName ? (
                        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Category</p>
                          <p className="text-sm text-[var(--text-primary)]">{selectedRevision.categoryName}</p>
                        </div>
                      ) : null}
                      {(() => {
                        const location = formatLocation(selectedRevision);
                        return location ? (
                          <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 sm:col-span-2">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Location</p>
                            <p className="text-sm text-[var(--text-primary)]">{location}</p>
                            {selectedRevision.locationLat != null && selectedRevision.locationLng != null ? (
                              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                {selectedRevision.locationLat.toFixed(4)}, {selectedRevision.locationLng.toFixed(4)}
                                {selectedRevision.locationZoom != null ? ` · zoom ${selectedRevision.locationZoom}` : ""}
                              </p>
                            ) : null}
                          </div>
                        ) : null;
                      })()}
                      {selectedRevision.songTitle ? (
                        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3 sm:col-span-2">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Song</p>
                          <p className="text-sm text-[var(--text-primary)]">
                            {selectedRevision.songTitle} — {selectedRevision.songArtist ?? "Unknown artist"}
                          </p>
                          {selectedRevision.songUrl ? (
                            <a href={selectedRevision.songUrl} target="_blank" rel="noreferrer noopener" className="mt-1 inline-block text-xs text-[var(--primary)] underline">
                              Open song link
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {selectedRevision.featuredImageUrl ? (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Featured image</p>
                        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL resolved server-side */}
                        <img
                          src={selectedRevision.featuredImageUrl}
                          alt={selectedRevision.featuredImageAlt ?? "Featured image"}
                          className="max-h-48 w-auto rounded-md object-contain"
                        />
                      </div>
                    ) : null}
                    <div className="rounded-lg bg-[var(--card-bg)] p-4 border border-[var(--border)]">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Content preview</p>
                      <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-primary)]">
                        {extractTextFromTiptapJson(selectedRevision.contentJson)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[var(--text-secondary)]">Select a revision from the list to preview it.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
