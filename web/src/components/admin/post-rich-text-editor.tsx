"use client";

import { useCallback, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

function getWordCount(value: string): number {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .length;
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
}) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
        active ? "bg-[var(--primary)] text-white" : "bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--accent-soft)]"
      } disabled:cursor-not-allowed disabled:opacity-50`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function EditorMenuBar({ editor }: { editor: Editor | null }) {
  const [linkDraft, setLinkDraft] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

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
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkDraft.trim() }).run();
    }

    setShowLinkInput(false);
  }, [editor, linkDraft]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rounded-t-2xl border-b border-[var(--border)] bg-[var(--accent-soft)] p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Formatting</span>
        <div className="flex flex-wrap gap-2">
          <MenuButton active={editor.isActive("bold")} disabled={!editor.can().chain().focus().toggleBold().run()} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
            B
          </MenuButton>
          <MenuButton active={editor.isActive("italic")} disabled={!editor.can().chain().focus().toggleItalic().run()} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
            I
          </MenuButton>
          <MenuButton active={editor.isActive("strike")} disabled={!editor.can().chain().focus().toggleStrike().run()} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
            S
          </MenuButton>
          <MenuButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
            H2
          </MenuButton>
          <MenuButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
            H3
          </MenuButton>
        </div>

        <span className="hidden h-6 w-px bg-[var(--border)] sm:block" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Structure</span>
        <div className="flex flex-wrap gap-2">
          <MenuButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
            Bullets
          </MenuButton>
          <MenuButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list">
            Numbers
          </MenuButton>
          <MenuButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
            Quote
          </MenuButton>
          <MenuButton active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block">
            Code
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
            Rule
          </MenuButton>
        </div>

        <span className="hidden h-6 w-px bg-[var(--border)] sm:block" />
        <div className="flex flex-wrap gap-2">
          <MenuButton active={editor.isActive("link")} onClick={setLink} title="Link">
            Link
          </MenuButton>
          <MenuButton disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()} title="Undo">
            Undo
          </MenuButton>
          <MenuButton disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()} title="Redo">
            Redo
          </MenuButton>
        </div>
      </div>

      {showLinkInput ? (
        <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-3">
          <input
            className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] sm:min-w-[14rem]"
            onChange={(event) => setLinkDraft(event.target.value)}
            placeholder="https://example.com"
            value={linkDraft}
          />
          <button className="rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white" onClick={applyLink} type="button">
            Apply link
          </button>
          <button className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]" onClick={() => setShowLinkInput(false)} type="button">
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function PostRichTextEditor({ content, inputName }: { content: string; inputName: string }) {
  const [html, setHtml] = useState(content);
  const wordCount = getWordCount(html);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));
  const extensions = [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: false,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: "text-[var(--primary)] underline hover:text-[var(--primary-light)] transition-colors",
      },
    }),
    Placeholder.configure({
      placeholder: "Start writing your adventure...",
    }),
  ] as unknown as NonNullable<Parameters<typeof useEditor>[0]>["extensions"];

  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor: currentEditor }) => {
      setHtml(currentEditor.getHTML());
    },
    immediatelyRender: false,
  });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
      <EditorMenuBar editor={editor} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs leading-6 text-[var(--text-secondary)]">
        <p>Use headings for structure, keep paragraphs short, and add links inline without leaving the editor.</p>
        <div className="flex flex-wrap items-center gap-2">
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
      <input name={inputName} type="hidden" value={html} />
    </div>
  );
}
