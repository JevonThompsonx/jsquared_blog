/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import imageCompression from "browser-image-compression";

type GalleryEntry = {
  imageUrl: string;
  altText: string;
  focalX: number;
  focalY: number;
};

type ParsedGalleryEntry = {
  imageUrl?: string;
  altText?: string;
  focalX?: number;
  focalY?: number;
};

type UploadPayload = {
  imageUrl?: string;
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseGalleryEntry(value: unknown): ParsedGalleryEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : undefined,
    altText: typeof value.altText === "string" ? value.altText : undefined,
    focalX: typeof value.focalX === "number" ? value.focalX : undefined,
    focalY: typeof value.focalY === "number" ? value.focalY : undefined,
  };
}

function parseUploadPayload(value: unknown): UploadPayload {
  if (!isRecord(value)) {
    return {};
  }

  return {
    imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : undefined,
    error: typeof value.error === "string" ? value.error : undefined,
  };
}

function needsAltTextReview(value: string): boolean {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return true;
  }

  return /\.(avif|gif|heic|jpe?g|png|webp)$/i.test(trimmedValue)
    || /^(img|image|dsc|pxl|mvimg|photo|scan|screenshot)[-_ ]?\d[\w-]*$/i.test(trimmedValue);
}

function objectPositionFromFocalPoint(focalX: number, focalY: number): string {
  return `${focalX}% ${focalY}%`;
}

function parseGalleryEntries(value: string): GalleryEntry[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => parseGalleryEntry(entry))
      .filter((entry): entry is ParsedGalleryEntry & { imageUrl: string } => Boolean(entry?.imageUrl))
      .map((entry) => ({
        imageUrl: entry.imageUrl,
        altText: entry.altText ?? "",
        focalX: typeof entry.focalX === "number" ? entry.focalX : 50,
        focalY: typeof entry.focalY === "number" ? entry.focalY : 50,
      }));
  } catch {
    return [];
  }
}

export function PostMediaManager({
  initialFeaturedImageUrl,
  initialFeaturedImageAlt,
  initialGalleryEntries,
}: {
  initialFeaturedImageUrl: string;
  initialFeaturedImageAlt: string;
  initialGalleryEntries: string;
}) {
  const [featuredImageUrl, setFeaturedImageUrl] = useState(initialFeaturedImageUrl);
  const [featuredImageAlt, setFeaturedImageAlt] = useState(initialFeaturedImageAlt);
  const [galleryEntries, setGalleryEntries] = useState<GalleryEntry[]>(() => parseGalleryEntries(initialGalleryEntries));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const encodedGalleryEntries = useMemo(
    () => JSON.stringify(galleryEntries.map((entry, index) => ({ ...entry, sortOrder: index }))),
    [galleryEntries],
  );
  const galleryEntriesNeedingAltReview = galleryEntries.filter((entry) => needsAltTextReview(entry.altText)).length;
  const featuredImageNeedsAltReview = featuredImageUrl ? needsAltTextReview(featuredImageAlt) : false;
  const accessibilityStatusLabel = !featuredImageNeedsAltReview && galleryEntriesNeedingAltReview === 0
    ? "Covered"
    : "Needs review";

  function updateGalleryEntry(index: number, updates: Partial<GalleryEntry>) {
    setGalleryEntries((currentEntries) => currentEntries.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...updates } : entry)));
  }

  function moveGalleryEntry(index: number, direction: "up" | "down") {
    setGalleryEntries((currentEntries) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= currentEntries.length) {
        return currentEntries;
      }

      const nextEntries = [...currentEntries];
      [nextEntries[index], nextEntries[targetIndex]] = [nextEntries[targetIndex], nextEntries[index]];
      return nextEntries;
    });
  }

  async function compressImage(file: File) {
    const compressedBlob = await imageCompression(file, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.85,
    });

    const compressedFileName = `${file.name.replace(/\.[^.]+$/, "")}.webp`;
    return new File([compressedBlob], compressedFileName, { type: "image/webp" });
  }

  async function uploadFiles(files: FileList | null, destination: "featured" | "gallery") {
    if (!files || files.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadStatus(null);
    setUploadSuccess(null);

    try {
      const selectedFiles = Array.from(files);

      for (const [index, file] of selectedFiles.entries()) {
        setUploadStatus(`Compressing ${index + 1}/${selectedFiles.length}: ${file.name}`);
        const optimizedFile = await compressImage(file);

        const formData = new FormData();
        formData.append("file", optimizedFile);

        setUploadStatus(`Uploading ${index + 1}/${selectedFiles.length}: ${optimizedFile.name}`);
        const response = await fetch("/api/admin/uploads/images", {
          method: "POST",
          body: formData,
        });

        const payload = parseUploadPayload(await response.json());
        if (!response.ok || !payload.imageUrl) {
          throw new Error(payload.error || "Upload failed");
        }

        const imageUrl = payload.imageUrl;

        if (destination === "featured") {
          setFeaturedImageUrl(imageUrl);
          setFeaturedImageAlt("");
        } else {
          setGalleryEntries((currentEntries) => [
            ...currentEntries,
            {
              imageUrl,
              altText: "",
              focalX: 50,
              focalY: 50,
            },
          ]);
        }
      }

      setUploadSuccess(destination === "featured" ? "Featured image updated." : "Gallery images uploaded successfully.");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadStatus(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Featured image</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{featuredImageUrl ? "Ready" : "Needed"}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Lead with one strong image that tells readers where the story begins.</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Gallery count</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{galleryEntries.length} image{galleryEntries.length === 1 ? "" : "s"}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Support the story arc with a small, deliberate sequence instead of a dump of photos.</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Accessibility</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{accessibilityStatusLabel}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Every image should have alt text that adds context, not just file-name filler.</p>
        </div>
      </div>

      {uploadError ? (
        <div className="rounded-lg border border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] px-4 py-3 text-sm text-[var(--color-error-text)]">
          {uploadError}
        </div>
      ) : null}

      {uploadSuccess ? (
        <div className="rounded-lg border border-[var(--color-success-soft-border)] bg-[var(--color-success-soft-bg)] px-4 py-3 text-sm text-[var(--color-success-text)]">
          {uploadSuccess}
        </div>
      ) : null}

      {uploadStatus ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {uploadStatus}
        </div>
      ) : null}

      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        Uploads are automatically compressed and converted to WebP before Cloudinary receives them.
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Featured image</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Upload a strong lead image that represents the whole story and give it useful alt text.</p>
          </div>
          <label className="inline-flex w-full cursor-pointer justify-center rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] shadow-md hover:bg-[var(--primary-light)] sm:w-auto">
            Upload featured image
            <input
              className="hidden"
              disabled={isUploading}
              onChange={(event) => void uploadFiles(event.target.files, "featured")}
              type="file"
              accept="image/*"
            />
          </label>
        </div>
      </div>

      {featuredImageUrl ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
            <img alt={featuredImageAlt || "Featured preview"} className="h-40 w-full object-cover sm:h-48" src={featuredImageUrl} />
          </div>
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-semibold text-[var(--foreground)]">
              Featured image alt text
              <input
                className="mt-2 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm"
                onChange={(event) => setFeaturedImageAlt(event.target.value)}
                placeholder="Describe the featured image"
                value={featuredImageAlt}
              />
            </label>
            {featuredImageNeedsAltReview ? (
              <p className="text-xs text-[var(--color-warning)]">
                {featuredImageAlt.trim()
                  ? "Replace the placeholder alt text before publishing so the hero image has real context for screen readers."
                  : "Add alt text before publishing so the hero image has context for screen readers."}
              </p>
            ) : null}
            <button className="text-sm font-semibold text-[var(--color-error)]" onClick={() => { setFeaturedImageUrl(""); setFeaturedImageAlt(""); }} type="button">
              Remove featured image
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-bg)] px-5 py-6 text-sm text-[var(--text-secondary)]">
          No featured image yet. Add one so the homepage card and post header feel intentional.
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Gallery images</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Upload supporting images, adjust the focal point, and order them in the sequence you want readers to experience.</p>
          </div>
          <label className="inline-flex w-full cursor-pointer justify-center rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--background)] sm:w-auto">
            Upload gallery images
            <input
              className="hidden"
              disabled={isUploading}
              multiple
              onChange={(event) => void uploadFiles(event.target.files, "gallery")}
              type="file"
              accept="image/*"
            />
          </label>
        </div>
      </div>

      {galleryEntries.length > 0 ? (
        <div className="space-y-3">
          {galleryEntries.map((entry, index) => (
            <div key={`${entry.imageUrl}-${index}`} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <div>
                  <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card-bg)]">
                    <img alt={entry.altText || `Gallery image ${index + 1}`} className="h-44 w-full object-cover md:h-36" src={entry.imageUrl} style={{ objectPosition: objectPositionFromFocalPoint(entry.focalX, entry.focalY) }} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">Image {index + 1}</span>
                    {needsAltTextReview(entry.altText) ? (
                      <span className="rounded-full bg-[var(--color-warning-soft-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-warning)]">
                        {entry.altText.trim() ? "Review alt text" : "Alt text needed"}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-[var(--foreground)]">
                    Alt text
                    <input
                      className="mt-2 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm"
                      onChange={(event) => updateGalleryEntry(index, { altText: event.target.value })}
                      placeholder="Describe what matters in this image"
                      value={entry.altText}
                    />
                  </label>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <label className="block text-sm text-[var(--text-secondary)]">
                      Focal X: {entry.focalX}%
                      <input
                        className="mt-1 w-full"
                        max={100}
                        min={0}
                        onChange={(event) => updateGalleryEntry(index, { focalX: Number(event.target.value) })}
                        type="range"
                        value={entry.focalX}
                      />
                    </label>
                    <label className="block text-sm text-[var(--text-secondary)]">
                      Focal Y: {entry.focalY}%
                      <input
                        className="mt-1 w-full"
                        max={100}
                        min={0}
                        onChange={(event) => updateGalleryEntry(index, { focalY: Number(event.target.value) })}
                        type="range"
                        value={entry.focalY}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50" disabled={index === 0} onClick={() => moveGalleryEntry(index, "up")} type="button">
                      Move up
                    </button>
                    <button className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50" disabled={index === galleryEntries.length - 1} onClick={() => moveGalleryEntry(index, "down")} type="button">
                      Move down
                    </button>
                    <button
                      className="rounded-full border border-[var(--color-error-soft-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-error)]"
                      onClick={() => setGalleryEntries((currentEntries) => currentEntries.filter((_, currentIndex) => currentIndex !== index))}
                      type="button"
                    >
                      Remove image
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-bg)] px-5 py-6 text-sm text-[var(--text-secondary)]">
          No gallery images yet. Add a few supporting shots to create rhythm through the post and on the detail page.
        </div>
      )}

      <input name="featuredImageUrl" type="hidden" value={featuredImageUrl} />
      <input name="featuredImageAlt" type="hidden" value={featuredImageAlt} />
      <input name="galleryEntries" type="hidden" value={encodedGalleryEntries} />
    </div>
  );
}
