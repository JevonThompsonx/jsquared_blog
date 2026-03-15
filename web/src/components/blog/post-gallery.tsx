/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { BlogImage } from "@/types/blog";

type GalleryImage = {
  id: string;
  imageUrl: string;
  altText: string | null;
};

type Props = {
  images: BlogImage[];
  postTitle: string;
  featuredImageUrl?: string | null;
};

export function PostGallery({ images, postTitle, featuredImageUrl }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const isOpen = activeIndex !== null;

  // Combined images: featured first, then gallery extras
  const allImages: GalleryImage[] = [
    ...(featuredImageUrl ? [{ id: "featured", imageUrl: featuredImageUrl, altText: postTitle }] : []),
    ...images,
  ];

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

  // Scroll lock: non-passive touchmove preventDefault (works on iOS) + body class for HomeFeed
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
          className="group relative block w-full cursor-zoom-in overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset"
          onClick={() => setActiveIndex(0)}
          type="button"
        >
          <img
            alt={postTitle}
            className="aspect-video w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
            loading="eager"
            src={featuredImageUrl}
          />
          {/* Expand affordance on hover */}
          <div className="absolute inset-0 flex items-end justify-end bg-black/0 transition-colors duration-300 group-hover:bg-black/10">
            <div className="m-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
              <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M15 3h6m0 0v6m0-6L14 10M9 21H3m0 0v-6m0 6l7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
              <img
                alt={image.altText ?? `${postTitle} — photo ${i + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
                src={image.imageUrl}
              />
              <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/15 rounded-lg" />
            </button>
          ))}
        </div>
      ) : null}

      {/* Lightbox */}
      {isOpen && active ? (
        <div
          aria-label="Image viewer"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92"
          role="dialog"
          onClick={close}
          onTouchEnd={onTouchEnd}
          onTouchStart={onTouchStart}
        >
          {/* Close */}
          <button
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl text-white transition-colors hover:bg-white/25 focus:outline-2 focus:outline-white"
            onClick={close}
            type="button"
          >
            ✕
          </button>

          {/* Prev / Next */}
          {allImages.length > 1 ? (
            <>
              <button
                aria-label="Previous"
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl text-white transition-colors hover:bg-white/25 focus:outline-2 focus:outline-white sm:left-4"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                type="button"
              >
                ←
              </button>
              <button
                aria-label="Next"
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl text-white transition-colors hover:bg-white/25 focus:outline-2 focus:outline-white sm:right-4"
                onClick={(e) => { e.stopPropagation(); next(); }}
                type="button"
              >
                →
              </button>
            </>
          ) : null}

          {/* Image */}
          <div
            className="flex max-h-[90vh] max-w-[90vw] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              alt={active.altText ?? postTitle}
              className="max-h-[80vh] max-w-[88vw] rounded-xl object-contain shadow-2xl"
              src={active.imageUrl}
            />
            {active.altText && active.altText !== postTitle ? (
              <p className="mt-3 max-w-sm text-center text-sm text-white/70">{active.altText}</p>
            ) : null}
          </div>

          {/* Dot indicators + counter */}
          {allImages.length > 1 ? (
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
              <div className="flex gap-1.5">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Go to photo ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-200 ${i === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/35 hover:bg-white/65"}`}
                    onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                    type="button"
                  />
                ))}
              </div>
              <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs text-white/60 backdrop-blur-sm">
                {(activeIndex ?? 0) + 1} / {allImages.length}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
