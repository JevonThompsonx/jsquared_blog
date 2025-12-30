import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="border-b border-[var(--border)] bg-[var(--background)] rounded-t-md p-2 flex flex-wrap gap-1">
      {/* Text Formatting */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
          editor.isActive('bold')
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20'
        }`}
        title="Bold (Ctrl/Cmd + B)"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`px-3 py-1.5 rounded text-sm italic font-semibold transition-colors ${
          editor.isActive('italic')
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20'
        }`}
        title="Italic (Ctrl/Cmd + I)"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`px-3 py-1.5 rounded text-sm line-through font-semibold transition-colors ${
          editor.isActive('strike')
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20'
        }`}
        title="Strikethrough"
      >
        S
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        className={`px-3 py-1.5 rounded text-sm font-mono transition-colors ${
          editor.isActive('code')
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20'
        }`}
        title="Inline Code"
      >
        {'<>'}
      </button>

      <div className="w-px h-8 bg-[var(--border)] mx-1" />

      {/* Headings */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${
          editor.isActive('heading', { level: 2 })
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20'
        }`}
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${
          editor.isActive('heading', { level: 3 })
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20'
        }`}
        title="Heading 3"
      >
        H3
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`px-3 py-1.5 rounded text-sm transition-colors ${
          editor.isActive('paragraph')
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20'
        }`}
        title="Paragraph"
      >
        P
      </button>

      <div className="w-px h-8 bg-[var(--border)] mx-1" />

      {/* Lists */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-3 py-1.5 rounded text-sm transition-colors ${
          editor.isActive('bulletList')
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20'
        }`}
        title="Bullet List"
      >
        • List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`px-3 py-1.5 rounded text-sm transition-colors ${
          editor.isActive('orderedList')
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20'
        }`}
        title="Numbered List"
      >
        1. List
      </button>

      <div className="w-px h-8 bg-[var(--border)] mx-1" />

      {/* Blockquote and Code Block */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`px-3 py-1.5 rounded text-sm transition-colors ${
          editor.isActive('blockquote')
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20'
        }`}
        title="Blockquote"
      >
        "
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`px-3 py-1.5 rounded text-sm font-mono transition-colors ${
          editor.isActive('codeBlock')
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20'
        }`}
        title="Code Block"
      >
        {'</>'}
      </button>

      <div className="w-px h-8 bg-[var(--border)] mx-1" />

      {/* Link and Horizontal Rule */}
      <button
        type="button"
        onClick={setLink}
        className={`px-3 py-1.5 rounded text-sm transition-colors ${
          editor.isActive('link')
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20'
        }`}
        title="Add Link"
      >
        🔗
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="px-3 py-1.5 rounded text-sm bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20 transition-colors"
        title="Horizontal Line"
      >
        ―
      </button>

      <div className="w-px h-8 bg-[var(--border)] mx-1" />

      {/* Undo/Redo */}
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="px-3 py-1.5 rounded text-sm bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Undo (Ctrl/Cmd + Z)"
      >
        ↶
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="px-3 py-1.5 rounded text-sm bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--primary)] hover:bg-opacity-20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Redo (Ctrl/Cmd + Shift + Z)"
      >
        ↷
      </button>
    </div>
  );
};

const RichTextEditor = ({ content, onChange, placeholder = 'Start writing your adventure...' }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        // Disable Link in StarterKit since we're configuring it separately
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--primary)] underline hover:text-[var(--primary-light)] transition-colors',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[300px] p-4 text-[var(--text-primary)]',
      },
    },
  });

  // Update editor content when prop changes (for editing existing posts)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="border border-[var(--border)] rounded-md bg-[var(--background)] shadow-sm">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
