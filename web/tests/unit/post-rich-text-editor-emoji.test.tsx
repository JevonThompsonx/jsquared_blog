// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const insertContentSpy = vi.fn();
const validateWarningsSpy = vi.fn().mockResolvedValue({ warnings: [] });
const emojiPickerPropsSpy = vi.fn();

const chainApi = {
  focus: vi.fn(() => chainApi),
  setParagraph: vi.fn(() => chainApi),
  toggleHeading: vi.fn(() => chainApi),
  toggleBold: vi.fn(() => chainApi),
  toggleItalic: vi.fn(() => chainApi),
  toggleBulletList: vi.fn(() => chainApi),
  toggleOrderedList: vi.fn(() => chainApi),
  toggleBlockquote: vi.fn(() => chainApi),
  insertThoughtsBlock: vi.fn(() => chainApi),
  extendMarkRange: vi.fn(() => chainApi),
  unsetLink: vi.fn(() => chainApi),
  setLink: vi.fn(() => chainApi),
  setImage: vi.fn(() => chainApi),
  toggleCodeBlock: vi.fn(() => chainApi),
  setHorizontalRule: vi.fn(() => chainApi),
  undo: vi.fn(() => chainApi),
  redo: vi.fn(() => chainApi),
  insertContent: vi.fn((value: string) => {
    insertContentSpy(value);
    return chainApi;
  }),
  run: vi.fn(() => true),
};

const fakeEditor = {
  isActive: vi.fn(() => false),
  can: vi.fn(() => ({ chain: () => chainApi })),
  chain: vi.fn(() => chainApi),
  getAttributes: vi.fn(() => ({})),
  getHTML: vi.fn(() => "<p>Hello world</p>"),
  getJSON: vi.fn(() => ({ type: "doc", content: [{ type: "paragraph" }] })),
  state: { storedMarks: null },
  view: { dispatch: vi.fn() },
};

vi.mock("@/app/admin/actions", () => ({
  validatePostContentWarningsAction: (...args: unknown[]) => validateWarningsSpy(...args),
}));

vi.mock("browser-image-compression", () => ({
  default: vi.fn(async (file: File) => file),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} {...props} />
  ),
}));

vi.mock("@/lib/tiptap/thoughts-block", () => ({
  ThoughtsBlock: {},
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: { configure: () => ({}) },
}));

vi.mock("@tiptap/extension-link", () => ({
  default: { configure: () => ({}) },
}));

vi.mock("@tiptap/extension-image", () => ({
  default: { configure: () => ({}) },
}));

vi.mock("@tiptap/extension-placeholder", () => ({
  default: { configure: () => ({}) },
}));

vi.mock("@tiptap/react", async () => {
  const React = await import("react");

  return {
    EditorContent: () => <div data-testid="editor-content" />,
    useEditor: (options: { onCreate?: (payload: { editor: typeof fakeEditor }) => void }) => {
      React.useEffect(() => {
        options.onCreate?.({ editor: fakeEditor });
      }, [options]);

      return fakeEditor;
    },
  };
});

vi.mock("emoji-picker-react", () => ({
  EmojiStyle: {
    NATIVE: "native",
  },
  default: (props: {
    emojiStyle?: string;
    onEmojiClick: (emojiData: { emoji: string }) => void;
  }) => {
    emojiPickerPropsSpy(props);

    if (props.emojiStyle !== "native") {
      return <div data-testid="emoji-picker-empty" />;
    }

    return (
      <div data-testid="emoji-picker-native">
        <button type="button" onClick={() => props.onEmojiClick({ emoji: "😀" })}>
          😀
        </button>
      </div>
    );
  },
}));

import { PostRichTextEditor } from "@/components/admin/post-rich-text-editor";

describe("PostRichTextEditor emoji picker", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    insertContentSpy.mockReset();
    validateWarningsSpy.mockClear();
    emojiPickerPropsSpy.mockClear();
    Object.values(chainApi).forEach((spy) => spy.mockClear());

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "0px";
      readonly thresholds = [0];

      disconnect() {}
      observe() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
      unobserve() {}
    }

    globalThis.IntersectionObserver = MockIntersectionObserver;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  async function renderEditor() {
    await act(async () => {
      root.render(
        <PostRichTextEditor
          contentJson='{"type":"doc","content":[]}'
          inputName="contentJson"
          excerpt="Short excerpt"
        />,
      );
    });
  }

  it("renders visible native emoji options when the picker opens", async () => {
    await renderEditor();

    const emojiToggle = container.querySelector('button[title="Insert emoji"]');
    expect(emojiToggle).not.toBeNull();

    await act(async () => {
      emojiToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(emojiPickerPropsSpy).toHaveBeenCalled();
    expect(container.textContent).toContain("😀");
    expect(container.querySelector('[data-testid="emoji-picker-native"]')).not.toBeNull();
  });

  it("does not call editor.getHTML while rendering derived stats", async () => {
    await renderEditor();

    expect(fakeEditor.getHTML).not.toHaveBeenCalled();
  });

  it("inserts the selected emoji and closes the picker", async () => {
    await renderEditor();

    const emojiToggle = container.querySelector('button[title="Insert emoji"]');
    await act(async () => {
      emojiToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const emojiButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "😀",
    );

    expect(emojiButton).not.toBeUndefined();

    await act(async () => {
      emojiButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(insertContentSpy).toHaveBeenCalledWith("😀");
    expect(container.querySelector('[data-testid="emoji-picker-native"]')).toBeNull();
  });
});
