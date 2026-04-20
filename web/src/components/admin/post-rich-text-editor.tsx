"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import NextImage from "next/image";
import EmojiPicker, { EmojiStyle, type EmojiClickData } from "emoji-picker-react";

import imageCompression from "browser-image-compression";

import { validatePostContentWarningsAction } from "@/app/admin/actions";
import { getReadingTimeMinutes, getWordCount, renderTiptapJson, type TiptapImageAltWarning } from "@/lib/content";
import { ThoughtsBlock } from "@/lib/tiptap/thoughts-block";

type EditorUploadResponse = {
  error?: string;
  imageUrl?: string;
};

type LegacyHtmlContent = {
  type: "legacy-html";
  html: string;
};

type TiptapInitDocument = {
  type: "doc";
  content?: unknown[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseEditorUploadResponse(value: unknown): EditorUploadResponse {
  if (!isRecord(value)) {
    return {};
  }

  const error = typeof value.error === "string" ? value.error : undefined;
  const imageUrl = typeof value.imageUrl === "string" ? value.imageUrl : undefined;
  return { error, imageUrl };
}

function isLegacyHtmlContent(value: unknown): value is LegacyHtmlContent {
  return isRecord(value) && value.type === "legacy-html" && typeof value.html === "string";
}

function isTiptapInitDocument(value: unknown): value is TiptapInitDocument {
  return isRecord(value) && value.type === "doc";
}

function MenuButton({
  active,
  children,
  disabled,
  onClick,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}): React.JSX.Element {
  return (
    <button
      aria-pressed={active}
      className={`flex items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors min-h-[2.5rem] min-w-[2.5rem] ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : "bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--accent-soft)]"
      } disabled:cursor-not-allowed disabled:opacity-50`}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function TextStyleDropdown({ editor }: { editor: Editor }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const isHeadingActive = editor.isActive("heading");

  const options = [
    { label: "Paragraph", active: !isHeadingActive, action: () => editor.chain().focus(undefined, { scrollIntoView: false }).setParagraph().run() },
    { label: "Heading 2", active: editor.isActive("heading", { level: 2 }), action: () => editor.chain().focus(undefined, { scrollIntoView: false }).toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", active: editor.isActive("heading", { level: 3 }), action: () => editor.chain().focus(undefined, { scrollIntoView: false }).toggleHeading({ level: 3 }).run() },
    { label: "Heading 4", active: editor.isActive("heading", { level: 4 }), action: () => editor.chain().focus(undefined, { scrollIntoView: false }).toggleHeading({ level: 4 }).run() },
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Text style"
        className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors min-h-[2.5rem] bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--accent-soft)]"
        onClick={() => setOpen((v) => !v)}
        onMouseDown={(e) => e.preventDefault()}
        title="Text style"
        type="button"
      >
        {/* Static label — pilcrow icon */}
        <span aria-hidden="true">¶</span>
        <svg aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-[var(--border)] bg-[var(--card-bg)] py-1 shadow-lg" role="listbox">
          {options.map((opt) => (
            <button
              key={opt.label}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                opt.active
                  ? "border-l-[3px] border-l-[var(--primary)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                  : "border-l-[3px] border-l-transparent text-[var(--text-primary)] hover:bg-[var(--accent-soft)]"
              }`}
              onClick={() => {
                opt.action();
                setOpen(false);
              }}
              onMouseDown={(e) => e.preventDefault()}
              role="option"
              aria-selected={opt.active}
              type="button"
            >
              {opt.active ? <span aria-hidden="true">✓</span> : <span className="w-[1ch]" />}
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ToolbarDivider(): React.JSX.Element {
  return <span className="hidden h-6 w-px shrink-0 bg-[var(--border)] sm:block" aria-hidden="true" />;
}

function EditorMenuBar({ editor }: { editor: Editor | null }): React.JSX.Element | null {
  const [linkDraft, setLinkDraft] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [imageDraftAlt, setImageDraftAlt] = useState("");
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Detect when toolbar becomes sticky via an Intersection Observer on a
  // zero-height sentinel element placed just above the toolbar. When the
  // sentinel scrolls out of view, the toolbar is stuck.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsStuck(!entry.isIntersecting);
        }
      },
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Close emoji picker when clicking outside it
  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleClickOutside(e: MouseEvent): void {
      if (emojiContainerRef.current && !emojiContainerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      if (!editor) return;
      editor.chain().focus(undefined, { scrollIntoView: false }).insertContent(emojiData.emoji).run();
      setShowEmojiPicker(false);
    },
    [editor],
  );

  const setLink = useCallback(() => {
    if (!editor) {
      return;
    }

    setLinkDraft(editor.getAttributes("link").href ?? "");
    setShowLinkInput(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) {
      return;
    }

    if (linkDraft.trim() === "") {
      editor.chain().focus(undefined, { scrollIntoView: false }).extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus(undefined, { scrollIntoView: false }).extendMarkRange("link").setLink({ href: linkDraft.trim() }).run();
    }

    setShowLinkInput(false);
  }, [editor, linkDraft]);

  const openImageUpload = useCallback(() => {
    setUploadError(null);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    // Reset so same file can be re-selected
    e.target.value = "";

    setIsUploadingImage(true);
    setUploadError(null);

    try {
      // Compress before upload to avoid 413s on large originals.
      // useWebWorker: false prevents browser-image-compression from loading
      // itself from jsdelivr CDN, which is blocked by the site's CSP.
      const compressed = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 2560,
        useWebWorker: false,
      });

      const body = new FormData();
      body.append("file", compressed);
      const res = await fetch("/api/admin/uploads/images", { method: "POST", body });
      const payload = parseEditorUploadResponse(await res.json());
      if (!res.ok || !payload.imageUrl) {
        throw new Error(payload.error ?? "Upload failed");
      }
      setPendingImageUrl(payload.imageUrl);
      setImageDraftAlt("");
      setShowImagePanel(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploadingImage(false);
    }
  }, [editor]);

  const insertImage = useCallback(() => {
    if (!editor || !pendingImageUrl) return;
    editor.chain().focus(undefined, { scrollIntoView: false }).setImage({ src: pendingImageUrl, alt: imageDraftAlt.trim() }).run();
    setShowImagePanel(false);
    setPendingImageUrl(null);
    setImageDraftAlt("");
  }, [editor, pendingImageUrl, imageDraftAlt]);

  if (!editor) {
    return null;
  }

  return (
    <>
      {/* Sentinel for sticky detection — sits at the toolbar's natural position */}
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />
      <div
        ref={toolbarRef}
        className={`sticky z-20 border-b border-[var(--border)] bg-[var(--surface)] p-3 backdrop-blur-[12px] transition-[border-radius,box-shadow] ${
          isStuck
            ? "rounded-none shadow-[var(--shadow)]"
            : "rounded-t-2xl"
        }`}
        style={{ top: "5rem" }}
      >
        {/* Horizontally scrollable button row for mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:gap-2 sm:overflow-x-visible">
          {/* Group: Text Style */}
          <TextStyleDropdown editor={editor} />

          <ToolbarDivider />

          {/* Group: Bold, Italic */}
          <MenuButton
            active={editor.isActive("bold")}
            disabled={!editor.can().chain().toggleBold().run()}
            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            B
          </MenuButton>
          <MenuButton
            active={editor.isActive("italic")}
            disabled={!editor.can().chain().toggleItalic().run()}
            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            I
          </MenuButton>

          <ToolbarDivider />

          {/* Group: Bullet, Ordered, Blockquote */}
          <MenuButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleBulletList().run()}
            title="Bullet list"
          >
            Bullets
          </MenuButton>
          <MenuButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleOrderedList().run()}
            title="Ordered list"
          >
            Numbers
          </MenuButton>
          <MenuButton
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleBlockquote().run()}
            title="Blockquote"
          >
            Quote
          </MenuButton>
          <MenuButton
            active={editor.isActive("thoughtsBlock")}
            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).insertThoughtsBlock().run()}
            title="Insert thoughts block"
          >
            Thoughts
          </MenuButton>

          <ToolbarDivider />

          {/* Group: Link, Image, Code, HR */}
          <MenuButton active={editor.isActive("link")} onClick={setLink} title="Link">
            Link
          </MenuButton>
          <MenuButton disabled={isUploadingImage} onClick={openImageUpload} title="Insert image">
            {isUploadingImage ? "Uploading\u2026" : "Image"}
          </MenuButton>
          <MenuButton
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleCodeBlock().run()}
            title="Code block"
          >
            Code
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).setHorizontalRule().run()}
            title="Horizontal rule"
          >
            HR
          </MenuButton>

          {/* Emoji picker — positioned relative to this container */}
          <div ref={emojiContainerRef} className="relative">
            <MenuButton
              active={showEmojiPicker}
              onClick={() => setShowEmojiPicker((v) => !v)}
              title="Insert emoji"
            >
              😊
            </MenuButton>
            {showEmojiPicker ? (
              <div className="absolute left-0 top-full z-50 mt-1 shadow-xl">
                <EmojiPicker
                  emojiStyle={EmojiStyle.NATIVE}
                  height={350}
                  width={300}
                  onEmojiClick={handleEmojiClick}
                />
              </div>
            ) : null}
          </div>

          <ToolbarDivider />

          {/* Group: Undo, Redo */}
          <MenuButton
            disabled={!editor.can().chain().undo().run()}
            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).undo().run()}
            title="Undo (Ctrl+Z)"
          >
            Undo
          </MenuButton>
          <MenuButton
            disabled={!editor.can().chain().redo().run()}
            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).redo().run()}
            title="Redo (Ctrl+Y)"
          >
            Redo
          </MenuButton>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          accept="image/*"
          aria-label="Upload image"
          className="hidden"
          onChange={handleFileChange}
          type="file"
        />

        {uploadError ? (
          <p className="mt-2 text-xs text-[var(--color-error)]">{uploadError}</p>
        ) : null}

        {showLinkInput ? (
          <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-3">
            <input
              aria-label="Link URL"
              className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] sm:min-w-[14rem]"
              onChange={(event) => setLinkDraft(event.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyLink(); }}
              placeholder="https://example.com"
              value={linkDraft}
            />
            <button
              className="rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-[var(--on-primary)]"
              onClick={applyLink}
              onMouseDown={(e) => e.preventDefault()}
              type="button"
            >
              Apply link
            </button>
            <button
              className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]"
              onClick={() => setShowLinkInput(false)}
              onMouseDown={(e) => e.preventDefault()}
              type="button"
            >
              Cancel
            </button>
          </div>
        ) : null}

        {showImagePanel && pendingImageUrl ? (
          <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-3">
            {/* Preview */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="preview" className="h-16 w-24 rounded-md object-cover" src={pendingImageUrl} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <input
                autoFocus
                aria-label="Image alt text"
                className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)]"
                onChange={(e) => setImageDraftAlt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") insertImage(); }}
                placeholder="Alt text (optional)"
                value={imageDraftAlt}
              />
              <div className="flex gap-2">
                <button
                  className="rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-[var(--on-primary)]"
                  onClick={insertImage}
                  onMouseDown={(e) => e.preventDefault()}
                  type="button"
                >
                  Insert image
                </button>
                <button
                  className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]"
                  onClick={() => { setShowImagePanel(false); setPendingImageUrl(null); }}
                  onMouseDown={(e) => e.preventDefault()}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

/**
 * Parse stored contentJson into a value Tiptap can consume.
 * - Tiptap JSON  → JSON object (passed directly)
 * - legacy-html  → HTML string (Tiptap parses it on load; saved back into native JSON)
 * - anything else → empty paragraph
 */
function parseTiptapInitContent(contentJson: string): string | Record<string, unknown> {
  if (!contentJson) return "<p></p>";
  try {
    const parsed = JSON.parse(contentJson);
    if (isLegacyHtmlContent(parsed)) return parsed.html;
    if (isTiptapInitDocument(parsed)) return parsed;
  } catch { /* fall through */ }
  return "<p></p>";
}

const EMPTY_DOC = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });

export function PostRichTextEditor({ contentJson, inputName, excerpt }: { contentJson: string; inputName: string; excerpt?: string | null }): React.JSX.Element {
  // tiptapJson holds the JSON string that will be submitted via the hidden input.
  const [tiptapJson, setTiptapJson] = useState<string>(() => {
    if (!contentJson) return EMPTY_DOC;
    try {
      const parsed = JSON.parse(contentJson);
      if (isTiptapInitDocument(parsed)) return contentJson;
    } catch { /* fall through */ }
    return EMPTY_DOC;
  });

  const [backendWarnings, setBackendWarnings] = useState<TiptapImageAltWarning[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const initContent = parseTiptapInitContent(contentJson);

  // Memoize so the array reference is stable across re-renders. Passing a new
  // array reference on every render can cause Tiptap 3.x to re-initialise
  // internal state and corrupt storedMarks, producing phantom bold/italic.
  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      link: false,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: "text-[var(--primary)] underline hover:text-[var(--primary-light)] transition-colors",
      },
    }),
    Image.configure({
      HTMLAttributes: {
        class: "rounded-xl my-4 max-w-full",
      },
    }),
    ThoughtsBlock,
    Placeholder.configure({
      placeholder: "Start writing your adventure...",
    }),
  ], []);

  // Track mouse-initiated selections so we can suppress ProseMirror's
  // automatic scrollIntoView on clicks (user clicked something visible).
  const isMouseDownRef = useRef(false);

  const editor = useEditor({
    extensions,
    content: initContent,
    editorProps: {
      handleDOMEvents: {
        mousedown: () => {
          isMouseDownRef.current = true;
          return false;
        },
        mouseup: () => {
          // Reset after a tick so handleScrollToSelection sees it first
          requestAnimationFrame(() => { isMouseDownRef.current = false; });
          return false;
        },
      },
      // ProseMirror calls scrollIntoView() on every selection-changing transaction.
      // For mouse clicks, always suppress — the user clicked something already visible.
      // For keyboard/programmatic changes, allow scroll so typing past the bottom
      // and arrow-key navigation still work.
      handleScrollToSelection: () => {
        if (isMouseDownRef.current) {
          return true; // suppress scroll on click
        }
        return false; // allow normal scroll for keyboard nav
      },
    },
    onCreate: ({ editor: e }) => {
      setTiptapJson(JSON.stringify(e.getJSON()));
    },
    onUpdate: ({ editor: e }) => {
      setTiptapJson(JSON.stringify(e.getJSON()));
    },
    // After a mouse-initiated selection change (click, double-click, drag),
    // clear storedMarks so formatting doesn't randomly activate.
    // Explicit toggles (Ctrl+B, toolbar buttons) still work because they
    // either apply marks directly (when text is selected) or set storedMarks
    // after our clearing (toolbar clicks don't fire mousedown on the editor).
    onSelectionUpdate: ({ editor: e }) => {
      if (isMouseDownRef.current && e.state.storedMarks !== null) {
        e.view.dispatch(e.state.tr.setStoredMarks(null));
      }
    },
    immediatelyRender: false,
  });

  // Debounced backend validation
  useEffect(() => {
    if (!tiptapJson) return;

    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const result = await validatePostContentWarningsAction(tiptapJson, excerpt);
        setBackendWarnings(result.warnings);
      } catch (err) {
        console.error("Failed to validate content:", err);
      } finally {
        setIsValidating(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [tiptapJson, excerpt]);

  const renderedEditorHtml = useMemo(() => renderTiptapJson(tiptapJson) ?? "", [tiptapJson]);

  // Derive stats from the canonical JSON rather than editor.getHTML() so a
  // broken serializer state cannot crash the whole editor surface.
  const wordCount = getWordCount(renderedEditorHtml);
  const readingMinutes = Math.max(1, getReadingTimeMinutes(renderedEditorHtml));
  const missingAltCount = backendWarnings.length;

  const [warningsDismissed, setWarningsDismissed] = useState(false);
  const warningSignature = useMemo(
    () => backendWarnings.map((warning) => `${warning.code}:${warning.path.join("-")}:${warning.imageSrc ?? ""}`).join("|"),
    [backendWarnings],
  );

  useEffect(() => {
    setWarningsDismissed(false);
  }, [warningSignature]);

  const showWarnings = backendWarnings.length > 0 && !warningsDismissed;

  return (
    <div className="space-y-3">
      {showWarnings && (
        <div className="rounded-lg border border-[var(--color-warning-soft-border)] bg-[var(--color-warning-soft-bg)] px-4 py-3 text-sm text-[var(--color-warning-text)]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-semibold">
                {missingAltCount === 1
                  ? "1 image still needs alt text before publishing."
                  : `${missingAltCount} images still need alt text before publishing.`}
              </p>
              {backendWarnings.map((w, i) => (
                <div key={`${w.code}-${w.path.join("-")}-${i}`} className="flex items-start gap-3 rounded-md bg-[var(--card-bg)] px-3 py-2">
                  <span className="text-lg">!</span>
                  {w.imageSrc ? (
                    <NextImage
                      src={w.imageSrc}
                      alt="Image missing alt text"
                      width={64}
                      height={48}
                      className="h-12 w-16 rounded-md object-cover"
                    />
                  ) : null}
                  <div className="flex flex-col">
                    <span>{w.message}</span>
                    {w.imageSrc ? (
                      <span className="text-[0.7rem] opacity-70 break-all">{w.imageSrc}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setWarningsDismissed(true)}
              className="text-[var(--color-warning)] hover:text-[var(--color-warning-text)] transition-colors"
              aria-label="Dismiss warning"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
        <EditorMenuBar editor={editor} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs leading-6 text-[var(--text-secondary)]">
          <p>Use headings for structure, keep paragraphs short, and add links inline without leaving the editor.</p>
          <div className="flex flex-wrap items-center gap-2">
            {isValidating && <span className="animate-pulse text-[var(--accent)]">Validating...</span>}
            {missingAltCount > 0 ? (
              <span className="rounded-full border border-[var(--color-warning-soft-border)] px-3 py-1 text-[var(--color-warning-text)]">
                {missingAltCount} alt warning{missingAltCount === 1 ? "" : "s"}
              </span>
            ) : null}
            <span className="rounded-full border border-[var(--border)] px-3 py-1">{wordCount} words</span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">~{readingMinutes} min read</span>
          </div>
        </div>
        <div className="min-h-[20rem] px-4 py-4 text-sm text-[var(--text-primary)] sm:min-h-[24rem]">
          <EditorContent editor={editor} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs leading-6 text-[var(--text-secondary)]">
          <span>Tip: the strongest travel posts alternate scene-setting paragraphs with subheads, quotes, and image breaks.</span>
          <span>Links open in a new tab automatically.</span>
        </div>
        <input name={inputName} type="hidden" value={tiptapJson} />
      </div>
    </div>
  );
}
