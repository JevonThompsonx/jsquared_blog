"use client";

import { useEffect, useRef } from "react";

type Props = {
  html: string;
  className?: string;
};

/**
 * Renders sanitized post HTML and makes any <img data-gallery-idx="N"> elements
 * clickable — clicking dispatches a "j2:open-lightbox" CustomEvent with the
 * gallery index so PostGallery can open the correct slide.
 */
export function ProseContent({ html, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const div = ref.current;
    if (!div) return;

    const imgs = div.querySelectorAll<HTMLImageElement>("img[data-gallery-idx]");
    const cleanups: Array<() => void> = [];

    imgs.forEach((img) => {
      const idx = parseInt(img.getAttribute("data-gallery-idx") ?? "0", 10);
      img.style.cursor = "zoom-in";

      function handleClick() {
        window.dispatchEvent(new CustomEvent("j2:open-lightbox", { detail: { index: idx } }));
      }

      img.addEventListener("click", handleClick);
      cleanups.push(() => img.removeEventListener("click", handleClick));
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [html]);

  // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml -- html prop is pre-sanitized before being passed: renderTiptapJson() produces controlled HTML from Tiptap's structured AST, then sanitizeRichTextHtml() strips script/style/iframe/object/embed tags, all inline event handlers, and javascript: URIs. Content is admin-authored only.
  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
