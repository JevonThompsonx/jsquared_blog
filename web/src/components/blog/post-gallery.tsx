"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NextImage from "next/image";

import type { BlogImage } from "@/types/blog";
import { cdnBlurDataUrl } from "@/lib/cloudinary/transform";

type GalleryImage = {
  id: string;
  imageUrl: string;
  altText: string | null;
};

type InlineImage = {
  imageUrl: string;
  altText: string | null;
};

type Props = {
  images: BlogImage[];
  inlineImages?: InlineImage[];
  postTitle: string;
  featuredImageUrl?: string | null;
};

function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M15 3h6m0 0v6m0-6L14 10M9 21H3m0 0v-6m0 6l7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PostGallery({ images, inlineImages, postTitle, featuredImageUrl }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);

  const isOpen = activeIndex !== null;

  // Combined images: featured first, then gallery extras, then inline content images
  const allImages: GalleryImage[] = [
    ...(featuredImageUrl ? [{ id: "featured", imageUrl: featuredImageUrl, altText: postTitle }] : []),
    ...images,
    ...(inlineImages ?? []).map((img, i) => ({ id: `inline-${i}`, imageUrl: img.imageUrl, altText: img.altText })),
  ];

  // Listen for inline image click events dispatched by ProseContent
  useEffect(() => {
    function handler(e: Event) {
      const idx = (e as CustomEvent<{ index: number }>).detail.index;
      setActiveIndex(idx);
    }
    window.addEventListener("j2:open-lightbox", handler);
    return () => window.removeEventListener("j2:open-lightbox", handler);
  }, []);

  // Thumbnail indices are offset by 1 when a featured image is present
  const thumbOffset = featuredImageUrl ? 1 : 0;

  const close = useCallback(() => setActiveIndex(null), []);

  const prev = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i - 1 + allImages.length) % allImages.length));
  }, [allImages.length]);

  const next = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i + 1) % allImages.length));
  }, [allImages.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, prev, next, close]);

  // Scroll lock
  useEffect(() => {
    if (!isOpen) return;
    function preventTouchScroll(e: TouchEvent) {
      e.preventDefault();
    }
    document.body.classList.add("lightbox-open");
    document.addEventListener("touchmove", preventTouchScroll, { passive: false });
    return () => {
      document.body.classList.remove("lightbox-open");
      document.removeEventListener("touchmove", preventTouchScroll);
    };
  }, [isOpen]);

  // Auto-scroll filmstrip to keep active thumbnail visible
  useEffect(() => {
    if (!isOpen || activeIndex === null || !filmstripRef.current) return;
    const strip = filmstripRef.current;
    const thumb = strip.children[activeIndex] as HTMLElement | undefined;
    if (thumb) {
      thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeIndex, isOpen]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartXRef.current;
    touchStartXRef.current = null;
    if (delta > 50) prev();
    else if (delta < -50) next();
  }

  const active = isOpen ? (allImages[activeIndex] ?? null) : null;

  return (
    <>
      {/* Featured hero image — full-width, clickable */}
      {featuredImageUrl ? (
        <button
          aria-label={allImages.length > 1 ? `View all ${allImages.length} photos` : "View full size"}
          className="group relative block aspect-video w-full cursor-zoom-in overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset"
          onClick={() => setActiveIndex(0)}
          type="button"
        >
          <NextImage
            alt={postTitle}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
            fill
            priority
            sizes="100vw"
            src={featuredImageUrl}
            placeholder={cdnBlurDataUrl(featuredImageUrl) ? "blur" : "empty"}
            blurDataURL={cdnBlurDataUrl(featuredImageUrl)}
          />
          <div className="absolute inset-0 flex items-end justify-end bg-black/0 transition-colors duration-300 group-hover:bg-black/10">
            <div className="m-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
              <ExpandIcon />
              {allImages.length > 1 ? `${allImages.length} photos` : "Full size"}
            </div>
          </div>
        </button>
      ) : null}

      {/* Gallery thumbnail strip (extra images beyond featured) */}
      {images.length > 0 ? (
        <div className="grid grid-cols-4 gap-1.5 px-5 pt-4 sm:grid-cols-5 sm:px-8 md:grid-cols-6">
          {images.map((image, i) => (
            <button
              key={image.id}
              aria-label={image.altText ?? `Photo ${i + 1}`}
              className="group relative aspect-square overflow-hidden rounded-lg focus:outline-2 focus:outline-[var(--primary)]"
              onClick={() => setActiveIndex(i + thumbOffset)}
              type="button"
            >
              <NextImage
                alt={image.altText ?? `${postTitle} — photo ${i + 1}`}
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                fill
                loading="lazy"
                sizes="(max-width: 640px) 25vw, (max-width: 1024px) 20vw, 15vw"
                src={image.imageUrl}
                placeholder={cdnBlurDataUrl(image.imageUrl) ? "blur" : "empty"}
                blurDataURL={cdnBlurDataUrl(image.imageUrl)}
              />
              <div className="absolute inset-0 rounded-lg bg-black/0 transition-colors duration-200 group-hover:bg-black/15" />
            </button>
          ))}
        </div>
      ) : null}

      {/* Lightbox */}
      {isOpen && active ? (
        <div
          aria-label="Image viewer"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          role="dialog"
          onClick={close}
          onTouchEnd={onTouchEnd}
          onTouchStart={onTouchStart}
        >
          {/* Top bar: counter + close */}
          <div className="flex shrink-0 items-center justify-between px-4 py-3" onClick={(e) => e.stopPropagation()}>
            {allImages.length > 1 ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/80 backdrop-blur-sm">
                {(activeIndex ?? 0) + 1} / {allImages.length}
              </span>
            ) : (
              <span />
            )}
            <button
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus:outline-2 focus:outline-white"
              onClick={close}
              type="button"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Main image area */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-16">
            {/* Prev */}
            {allImages.length > 1 ? (
              <button
                aria-label="Previous photo"
                className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus:outline-2 focus:outline-white sm:left-4"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                type="button"
              >
                <ChevronLeftIcon />
              </button>
            ) : null}

            {/* Image — key triggers fade animation on each change */}
            <div
              key={activeIndex}
              className="lightbox-img-enter flex max-h-full flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={active.altText ?? postTitle}
                className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
                src={active.imageUrl}
                style={{ maxHeight: "calc(100vh - 12rem)" }}
              />
              {active.altText && active.altText !== postTitle ? (
                <p className="mt-3 max-w-md text-center text-sm text-white/60">{active.altText}</p>
              ) : null}
            </div>

            {/* Next */}
            {allImages.length > 1 ? (
              <button
                aria-label="Next photo"
                className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus:outline-2 focus:outline-white sm:right-4"
                onClick={(e) => { e.stopPropagation(); next(); }}
                type="button"
              >
                <ChevronRightIcon />
              </button>
            ) : null}
          </div>

          {/* Filmstrip */}
          {allImages.length > 1 ? (
            <div
              className="shrink-0 border-t border-white/10 bg-black/40 px-4 py-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                ref={filmstripRef}
                className="flex gap-2 overflow-x-auto pb-1"
                style={{ scrollbarWidth: "none" }}
              >
                {allImages.map((img, i) => (
                  <button
                    key={img.id}
                    aria-label={img.altText ?? `Photo ${i + 1}`}
                    className={`relative shrink-0 overflow-hidden rounded-lg transition-all duration-200 focus:outline-2 focus:outline-white ${
                      i === activeIndex
                        ? "ring-2 ring-white ring-offset-1 ring-offset-black opacity-100"
                        : "opacity-50 hover:opacity-80"
                    }`}
                    onClick={() => setActiveIndex(i)}
                    type="button"
                  >
                    <NextImage
                      alt={img.altText ?? `Photo ${i + 1}`}
                      className="object-cover"
                      height={56}
                      loading="lazy"
                      src={img.imageUrl}
                      width={80}
                      placeholder={cdnBlurDataUrl(img.imageUrl) ? "blur" : "empty"}
                      blurDataURL={cdnBlurDataUrl(img.imageUrl)}
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
