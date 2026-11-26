"use client";

import { useEffect, useMemo, useRef } from "react";

import { enhanceProseImagesHtml } from "@/lib/cloudinary/transform";

type Props = {
  html: string;
  className?: string;
};

/**
 * Renders sanitized post HTML and makes any <img data-gallery-idx="N"> elements
 * clickable — clicking (or pressing Enter/Space) dispatches a
 * "j2:open-lightbox" CustomEvent with the gallery index so PostGallery can open
 * the correct slide.
 *
 * Before rendering, `<img>` tags are rewritten server/client-side by
 * enhanceProseImagesHtml(): Cloudinary URLs get f_auto,q_auto,w_1200 plus a
 * width-descriptor srcSet, and gallery images get button semantics. The
 * transform only touches attributes, so data-gallery-idx values — and therefore
 * the lightbox index mapping — are preserved.
 */
export function ProseContent({ html, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const enhancedHtml = useMemo(() => enhanceProseImagesHtml(html), [html]);

  useEffect(() => {
    const div = ref.current;
    if (!div) return;

    const imgs = div.querySelectorAll<HTMLImageElement>(
      "img[data-gallery-idx]",
    );
    const cleanups: Array<() => void> = [];

    imgs.forEach((img) => {
      const idx = parseInt(img.getAttribute("data-gallery-idx") ?? "0", 10);
      img.style.cursor = "zoom-in";

      function openLightbox() {
        window.dispatchEvent(
          new CustomEvent("j2:open-lightbox", { detail: { index: idx } }),
        );
      }

      function handleClick() {
        openLightbox();
      }

      function handleKeyDown(event: KeyboardEvent) {
        if (
          event.key === "Enter" ||
          event.key === " " ||
          event.key === "Spacebar"
        ) {
          // Images are not native buttons, so Space would scroll the page.
          event.preventDefault();
          openLightbox();
        }
      }

      img.addEventListener("click", handleClick);
      img.addEventListener("keydown", handleKeyDown);
      cleanups.push(() => {
        img.removeEventListener("click", handleClick);
        img.removeEventListener("keydown", handleKeyDown);
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [enhancedHtml]);

  // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml -- html prop is pre-sanitized before being passed: renderTiptapJson() produces controlled HTML from Tiptap's structured AST, then sanitizeRichTextHtml() strips script/style/iframe/object/embed tags, all inline event handlers, and javascript: URIs. Content is admin-authored only.
  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: enhancedHtml }}
    />
  );
}
