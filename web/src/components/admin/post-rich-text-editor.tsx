"use client";

import { useCallback, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

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
  const setLink = useCallback(() => {
    if (!editor) {
      return;
    }

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) {
      return;
    }

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-t-2xl border-b border-[var(--border)] bg-[var(--accent-soft)] p-3">
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
      <MenuButton active={editor.isActive("link")} onClick={setLink} title="Link">
        Link
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
        Rule
      </MenuButton>
      <MenuButton disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()} title="Undo">
        Undo
      </MenuButton>
      <MenuButton disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()} title="Redo">
        Redo
      </MenuButton>
    </div>
  );
}

export function PostRichTextEditor({ content, inputName }: { content: string; inputName: string }) {
  const [html, setHtml] = useState(content);
  const editor = useEditor({
    extensions: [
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
    ],
    content,
    onUpdate: ({ editor: currentEditor }) => {
      setHtml(currentEditor.getHTML());
    },
    immediatelyRender: false,
  });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
      <EditorMenuBar editor={editor} />
      <div className="min-h-[24rem] px-4 py-4 text-sm text-[var(--text-primary)]">
        <EditorContent editor={editor} />
      </div>
      <input name={inputName} type="hidden" value={html} />
    </div>
  );
}
