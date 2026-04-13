"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminCategoryRecord, AdminEditablePostRecord } from "@/server/dal/admin-posts";
import type { SeriesRecord } from "@/server/dal/series";
import { getPostHref } from "@/lib/utils";
import { clonePost, createPostPreviewLinkAction } from "@/app/admin/actions";
import { parseSpotifyEmbedUrl } from "@/lib/spotify";
import { ComboboxInput } from "@/components/admin/combobox-input";
import { LocationAutocomplete } from "@/components/admin/location-autocomplete";
import { PostMediaManager } from "@/components/admin/post-media-manager";
import { PostRichTextEditor } from "@/components/admin/post-rich-text-editor";
import { SeriesSelector } from "@/components/admin/series-selector";
import { TagMultiSelect } from "@/components/admin/tag-multi-select";
import { RevisionHistory } from "@/components/admin/revision-history";

type SongPreviewResponse = {
  song: {
    title: string | null;
    artist: string | null;
    url: string;
    spotify: {
      kind: "track" | "playlist" | "album";
      canonicalUrl: string;
      embedUrl: string;
      height: number;
    } | null;
  };
  artworkUrl?: string | null;
  source: "manual" | "spotify-oembed";
};

type AdminTag = { id: string; name: string; slug: string };
type AdminReturnRoute = "/admin" | `/admin?${string}`;

function formatDateTimeLocal(value: Date): string {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

export function PostEditorForm({
  mode,
  categories,
  allSeries,
  allTags,
  post,
  returnTo = "/admin",
  action,
}: {
  mode: "create" | "edit";
  categories: AdminCategoryRecord[];
  allSeries: SeriesRecord[];
  allTags: AdminTag[];
  post?: AdminEditablePostRecord | null;
  returnTo?: AdminReturnRoute;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [showCloneConfirm, setShowCloneConfirm] = useState(false);
  const cloneCancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [songTitleDraft, setSongTitleDraft] = useState(post?.songTitle ?? "");
  const [songArtistDraft, setSongArtistDraft] = useState(post?.songArtist ?? "");
  const [songUrlDraft, setSongUrlDraft] = useState(post?.songUrl ?? "");
  const [songPreview, setSongPreview] = useState<SongPreviewResponse | null>(null);
  const [songPreviewError, setSongPreviewError] = useState<string | null>(null);
  const [isSongPreviewPending, startSongPreviewTransition] = useTransition();

  useEffect(() => {
    if (showCloneConfirm) {
      cloneCancelButtonRef.current?.focus();
    }
  }, [showCloneConfirm]);

  const handlePreview = () => {
    if (!post?.id) return;
    setPreviewError(null);
    startTransition(async () => {
      try {
        const result = await createPostPreviewLinkAction(post.id);
        window.open(result.previewPath, "_blank", "noopener,noreferrer");
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : "Failed to create preview");
      }
    });
  };

  const handleClone = () => {
    if (!post?.id) return;
    setCloneError(null);
    setShowCloneConfirm(false);
    startTransition(async () => {
      try {
        // Save the current form state first so the clone captures the latest edits.
        if (formRef.current) {
          const formData = new FormData(formRef.current);
          await action(formData);
        }
        const result = await clonePost(post.id);
        const nextUrl = new URL(returnTo, window.location.origin);
        nextUrl.searchParams.set("postId", result.postId);
        nextUrl.searchParams.set("cloned", "1");
        const nextRoute = `${nextUrl.pathname}${nextUrl.search}` as AdminReturnRoute;
        router.push(nextRoute);
      } catch (err) {
        setCloneError(err instanceof Error ? err.message : "Failed to clone post");
      }
    });
  };

  const [browserOffsetMinutes, setBrowserOffsetMinutes] = useState("");

  const spotifyEmbed = useMemo(() => parseSpotifyEmbedUrl(songUrlDraft), [songUrlDraft]);

  useEffect(() => {
    setBrowserOffsetMinutes(new Date().getTimezoneOffset().toString());
  }, []);

  useEffect(() => {
    setSongPreviewError(null);

    const trimmedUrl = songUrlDraft.trim();
    if (!trimmedUrl) {
      setSongPreview(null);
      return;
    }

    const timer = window.setTimeout(() => {
      startSongPreviewTransition(async () => {
        try {
          const response = await fetch("/api/admin/song-preview", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: trimmedUrl }),
          });
          const payload = await response.json() as SongPreviewResponse | { error?: string };
          if (!response.ok || !("song" in payload)) {
            throw new Error((payload as { error?: string }).error ?? "Song preview unavailable");
          }

          setSongPreview(payload);

          setSongTitleDraft((current) => current.trim() || !payload.song.title ? current : payload.song.title);
          setSongArtistDraft((current) => current.trim() || !payload.song.artist ? current : payload.song.artist);
        } catch (error) {
          setSongPreview(null);
          setSongPreviewError(error instanceof Error ? error.message : "Song preview unavailable");
        }
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [songUrlDraft]);

  const buttonLabel = mode === "create" ? "Create post" : "Save changes";
  const modeLabel = mode === "create" ? "New story" : "Editing story";
  const scheduledValue = post?.scheduledPublishTime
    ? formatDateTimeLocal(new Date(post.scheduledPublishTime))
    : "";
  // If a post is flagged "scheduled" but has no time set (e.g. imported legacy data),
  // fall back to "draft" so the form doesn't immediately submit an invalid payload.
  const defaultStatus =
    post?.status === "scheduled" && !scheduledValue ? "draft" : (post?.status ?? "draft");
  const tagCount = post?.tags.length ?? 0;
  const galleryCount = post?.galleryImages.length ?? 0;
  const galleryEntriesValue = JSON.stringify(
    post?.galleryImages.map((image) => ({
      imageUrl: image.imageUrl,
      altText: image.altText ?? "",
      focalX: image.focalX ?? 50,
      focalY: image.focalY ?? 50,
      exifTakenAt: image.exifTakenAt ? new Date(image.exifTakenAt).getTime() : null,
      exifLat: image.exifLat,
      exifLng: image.exifLng,
      exifCameraMake: image.exifCameraMake,
      exifCameraModel: image.exifCameraModel,
      exifLensModel: image.exifLensModel,
      exifAperture: image.exifAperture,
      exifShutterSpeed: image.exifShutterSpeed,
      exifIso: image.exifIso,
    })) ?? [],
  );

  return (
    <form ref={formRef} action={action} className="space-y-8">
      <input name="scheduledPublishOffsetMinutes" type="hidden" value={browserOffsetMinutes} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <div className="sticky top-24 z-20 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-4 shadow-lg sm:px-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Editor actions</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Save often, review your schedule, and make sure every uploaded image has strong alt text.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
            <span className="rounded-full border border-[var(--border)] px-3 py-1">{modeLabel}</span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">{defaultStatus}</span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">{tagCount} tag{tagCount === 1 ? "" : "s"}</span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">{galleryCount} gallery image{galleryCount === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          {post?.id ? (
            <>
              {showCloneConfirm ? (
                <div
                  className="flex flex-wrap items-center gap-2 rounded-full border border-[var(--color-warning-soft-border)] bg-[var(--color-warning-soft-bg)] px-3 py-2"
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setShowCloneConfirm(false);
                    }
                  }}
                >
                  <span className="text-xs font-semibold text-[var(--color-warning-text)]">Clone this post into a new draft?</span>
                  <button
                    ref={cloneCancelButtonRef}
                    type="button"
                    onClick={() => setShowCloneConfirm(false)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleClone}
                    disabled={isPending}
                    className="rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-light)] disabled:opacity-50"
                  >
                    {isPending ? "Cloning..." : "Clone draft"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCloneError(null);
                    setShowCloneConfirm(true);
                  }}
                  disabled={isPending}
                  className="rounded-full border border-[var(--border)] px-4 py-2 text-center text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--accent-soft)] disabled:opacity-50"
                >
                  Clone draft
                </button>
              )}
              {post.id && mode === "edit" ? <RevisionHistory postId={post.id} /> : null}
              {post.status !== "published" ? (
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={isPending}
                  className="rounded-full border border-[var(--border)] px-4 py-2 text-center text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--accent-soft)] disabled:opacity-50"
                >
                  {isPending ? "Generating..." : "Preview"}
                </button>
              ) : null}
            </>
          ) : null}
          {post?.slug && post?.status === "published" ? (
            <Link className="rounded-full border border-[var(--border)] px-4 py-2 text-center text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--accent-soft)] sm:text-left" href={getPostHref({ id: post.id, title: post.title, slug: post.slug })}>
              View live
            </Link>
          ) : null}
          <button className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--on-primary)] shadow-md transition-colors hover:bg-[var(--primary-light)]" type="submit">
            {buttonLabel}
          </button>
        </div>
      </div>

      {(previewError || cloneError) && (
        <div className="rounded-lg border border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] p-4 text-sm text-[var(--color-error-text)]">
          {previewError || cloneError}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2.15fr)_minmax(24rem,1fr)]">
        <div className="space-y-6 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Core details</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">{mode === "create" ? "Create a new post" : "Edit post"}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">Shape the story first, then refine the supporting details. A strong title, clean excerpt, and clear structure do most of the work.</p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Title</span>
            <input className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={post?.title ?? ""} name="title" required />
            <span className="mt-2 block text-xs text-[var(--text-secondary)]">Keep it specific and place-led so readers immediately know what kind of adventure they are opening.</span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Slug</span>
            <input className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={post?.slug ?? ""} name="slug" placeholder="auto-generated-from-title" />
            <span className="mt-2 block text-xs text-[var(--text-secondary)]">Leave this blank to auto-generate it, or set a clean URL if the story needs a shorter path.</span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Excerpt</span>
            <textarea className="mt-1 block min-h-28 w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={post?.excerpt ?? ""} maxLength={280} name="excerpt" />
            <span className="mt-2 block text-xs text-[var(--text-secondary)]">This powers cards, previews, and search context. Aim for one vivid sentence rather than a paragraph.</span>
          </label>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Song metadata</p>
            <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">Optional structured music context for the story. Use plain text and a direct HTTPS link only.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-1">
                <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Song title</span>
                <input
                  className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50"
                  name="songTitle"
                  onChange={(event) => setSongTitleDraft(event.target.value)}
                  value={songTitleDraft}
                />
              </label>
              <label className="block sm:col-span-1">
                <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Artist</span>
                <input
                  className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50"
                  name="songArtist"
                  onChange={(event) => setSongArtistDraft(event.target.value)}
                  value={songArtistDraft}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Song link</span>
                <input
                  className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50"
                  name="songUrl"
                  onChange={(event) => setSongUrlDraft(event.target.value)}
                  placeholder="https://open.spotify.com/track/..."
                  type="url"
                  value={songUrlDraft}
                />
              </label>
            </div>
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card-bg)]/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Song preview</p>
                  <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
                    Paste any HTTPS audio link. Spotify track, album, and playlist links auto-preview and can autofill the display title.
                  </p>
                </div>
                {isSongPreviewPending ? <span className="text-xs text-[var(--accent)]">Checking link...</span> : null}
              </div>

              {songPreviewError ? (
                <p className="mt-3 text-xs text-[var(--color-error-text)]">{songPreviewError}</p>
              ) : null}

              {songPreview ? (
                <div className="mt-4 space-y-3">
                  {songPreview.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="Song artwork preview" className="h-20 w-20 rounded-xl object-cover" src={songPreview.artworkUrl} />
                  ) : null}

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{songPreview.song.title ?? "Playable audio link"}</p>
                    {songPreview.song.artist ? (
                      <p className="text-xs text-[var(--text-secondary)]">{songPreview.song.artist}</p>
                    ) : null}
                  </div>

                  {songPreview.song.spotify ? (
                    <iframe
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      className="w-full rounded-xl"
                      height={songPreview.song.spotify.height}
                      loading="lazy"
                      src={songPreview.song.spotify.embedUrl}
                      title={songPreview.song.title ?? "Spotify player preview"}
                    />
                  ) : (
                    <a
                      className="inline-flex text-sm font-semibold text-[var(--accent)] hover:underline"
                      href={songPreview.song.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Open audio link
                    </a>
                  )}
                </div>
              ) : songUrlDraft.trim() ? (
                <p className="mt-3 text-xs text-[var(--text-secondary)]">
                  {spotifyEmbed ? "Spotify preview loading..." : "This will render as a normal external audio link on the post."}
                </p>
              ) : null}
            </div>
          </section>

          <div>
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Tags</span>
            <TagMultiSelect
              allTags={allTags}
              defaultTagNames={post?.tags.map((t) => t.name) ?? []}
            />
            <span className="mt-2 block text-xs text-[var(--text-secondary)]">Use a few discovery-friendly tags that reflect place, activity, or season.</span>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Story body</span>
            <PostRichTextEditor 
              contentJson={post?.contentJson ?? ""} 
              inputName="contentJson" 
              excerpt={post?.excerpt}
            />
          </label>
        </div>

        <div className="space-y-6 xl:sticky xl:top-44 xl:self-start">
            <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Publishing</p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">Decide whether the post should go live immediately, stay in progress, or wait for a future release window.</p>

            <div className="mt-5 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Status</span>
                <select className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={defaultStatus} name="status">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Scheduled publish time</span>
                <input className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={scheduledValue} name="scheduledPublishTime" type="datetime-local" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Layout</span>
                <select className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={post?.layoutType ?? "standard"} name="layoutType">
                  <option value="standard">Standard</option>
                  <option value="split-horizontal">Split horizontal</option>
                  <option value="split-vertical">Split vertical</option>
                  <option value="hover">Hover</option>
                </select>
              </label>
            </div>
          </section>

            <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Categorization</p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">Use a category that helps readers browse by trip type, then support it with tags for the finer details.</p>
            <div className="mt-5">
              <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Category</span>
              <ComboboxInput
                defaultValue={post?.category ?? ""}
                name="categoryName"
                options={categories.map((c) => ({ id: c.id, label: c.name }))}
                placeholder="Start typing or pick a category"
              />
            </div>
          </section>

            <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Series</p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">Group this post into a named series. Selecting an existing series auto-fills the next available part number.</p>
            <div className="mt-5">
              <SeriesSelector
                allSeries={allSeries.map((s) => ({ id: s.id, label: s.title }))}
                defaultSeriesOrder={post?.seriesOrder ?? null}
                defaultSeriesTitle={post?.seriesTitle ?? null}
              />
            </div>
          </section>

            <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Location</p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">Add a location for this post. Be as specific or broad as you like — &quot;Portland, Oregon&quot;, &quot;California&quot;, or &quot;Pacific Northwest&quot; all work. Coordinates are geocoded automatically on save.</p>
            <div className="mt-5 space-y-4">
              <div>
                <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Location name</span>
                <LocationAutocomplete defaultValue={post?.locationName ?? ""} />
                <span className="mt-1.5 block text-xs text-[var(--text-secondary)]">A city, region, country, or any recognizable place name. Start typing for suggestions. Leave blank to remove the location.</span>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">iOverlander link</span>
                <input
                  className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50"
                  defaultValue={post?.iovanderUrl ?? ""}
                  name="iovanderUrl"
                  placeholder="https://www.ioverlander.com/places/..."
                  type="url"
                />
                <span className="mt-1.5 block text-xs text-[var(--text-secondary)]">Optional link to the iOverlander camp or place entry for this location.</span>
              </label>
            </div>
          </section>

            <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Media</p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">Lead with one memorable image, then curate a smaller supporting gallery that moves with the story instead of repeating it.</p>
            <div className="mt-5">
              <PostMediaManager
                initialFeaturedImageAlt={post?.featuredImageAlt ?? ""}
                initialFeaturedImageUrl={post?.imageUrl ?? ""}
                initialGalleryEntries={galleryEntriesValue}
              />
            </div>
          </section>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-sm leading-7 text-[var(--text-secondary)] xl:p-5">
            Publishing checklist: title, slug, excerpt, featured image, alt text, category, tags, body content, and either a publish date or scheduled time.
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 text-sm text-[var(--text-secondary)] shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Story quality pass</p>
            <ul className="mt-4 space-y-2 leading-7">
              <li>Open with a concrete scene so the story feels grounded immediately.</li>
              <li>Use subheads to break up longer sections and help scanning on mobile.</li>
              <li>Make sure every image adds something new rather than repeating the same viewpoint.</li>
            </ul>
          </div>
        </div>
      </section>
    </form>
  );
}
