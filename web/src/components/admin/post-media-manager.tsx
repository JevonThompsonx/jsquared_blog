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

function parseGalleryEntries(value: string): GalleryEntry[] {
  try {
    const parsed = JSON.parse(value) as Array<{ imageUrl?: string; altText?: string; focalX?: number; focalY?: number }>;
    return parsed
      .filter((entry): entry is { imageUrl: string; altText?: string; focalX?: number; focalY?: number } => Boolean(entry?.imageUrl))
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

  const encodedGalleryEntries = useMemo(
    () => JSON.stringify(galleryEntries.map((entry, index) => ({ ...entry, sortOrder: index }))),
    [galleryEntries],
  );

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

        const payload = await response.json() as { imageUrl?: string; error?: string };
        if (!response.ok || !payload.imageUrl) {
          throw new Error(payload.error || "Upload failed");
        }

        const imageUrl = payload.imageUrl;

        if (destination === "featured") {
          setFeaturedImageUrl(imageUrl);
          setFeaturedImageAlt((currentAlt) => currentAlt || file.name.replace(/\.[^.]+$/, ""));
        } else {
          setGalleryEntries((currentEntries) => [
            ...currentEntries,
            {
              imageUrl,
              altText: file.name.replace(/\.[^.]+$/, ""),
              focalX: 50,
              focalY: 50,
            },
          ]);
        }
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadStatus(null);
    }
  }

  return (
    <div className="space-y-5">
      {uploadError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {uploadError}
        </div>
      ) : null}

      {uploadStatus ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {uploadStatus}
        </div>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Featured image upload</span>
        <input
          className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm"
          disabled={isUploading}
          onChange={(event) => void uploadFiles(event.target.files, "featured")}
          type="file"
          accept="image/*"
        />
      </label>

      {featuredImageUrl ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
          <img alt={featuredImageAlt || "Featured preview"} className="h-40 w-full rounded-lg object-cover" src={featuredImageUrl} />
        </div>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Gallery image uploads</span>
        <input
          className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm"
          disabled={isUploading}
          multiple
          onChange={(event) => void uploadFiles(event.target.files, "gallery")}
          type="file"
          accept="image/*"
        />
      </label>

      {galleryEntries.length > 0 ? (
        <div className="space-y-3">
          {galleryEntries.map((entry, index) => (
            <div key={`${entry.imageUrl}-${index}`} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                <img alt={entry.altText || `Gallery image ${index + 1}`} className="h-28 w-full rounded-lg object-cover" src={entry.imageUrl} />
                <div className="space-y-3">
                  <input
                    className="mt-1 block w-full rounded-md border-[var(--border)] bg-white px-3 py-2 text-[var(--text-primary)] shadow-sm"
                    onChange={(event) => {
                      const nextEntries = [...galleryEntries];
                      nextEntries[index] = { ...nextEntries[index], altText: event.target.value };
                      setGalleryEntries(nextEntries);
                    }}
                    placeholder="Alt text"
                    value={entry.altText}
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block text-sm text-[var(--text-secondary)]">
                      Focal X: {entry.focalX}%
                      <input
                        className="mt-1 w-full"
                        max={100}
                        min={0}
                        onChange={(event) => {
                          const nextEntries = [...galleryEntries];
                          nextEntries[index] = { ...nextEntries[index], focalX: Number(event.target.value) };
                          setGalleryEntries(nextEntries);
                        }}
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
                        onChange={(event) => {
                          const nextEntries = [...galleryEntries];
                          nextEntries[index] = { ...nextEntries[index], focalY: Number(event.target.value) };
                          setGalleryEntries(nextEntries);
                        }}
                        type="range"
                        value={entry.focalY}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <button className="text-sm font-semibold text-[var(--primary)]" onClick={() => moveGalleryEntry(index, "up")} type="button">
                      Move up
                    </button>
                    <button className="text-sm font-semibold text-[var(--primary)]" onClick={() => moveGalleryEntry(index, "down")} type="button">
                      Move down
                    </button>
                    <button
                      className="text-sm font-semibold text-red-600"
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
      ) : null}

      <input name="featuredImageUrl" type="hidden" value={featuredImageUrl} />
      <input name="featuredImageAlt" type="hidden" value={featuredImageAlt} />
      <input name="galleryEntries" type="hidden" value={encodedGalleryEntries} />
    </div>
  );
}
