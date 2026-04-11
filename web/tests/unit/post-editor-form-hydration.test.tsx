/**
 * Regression test for React hydration error #418 in PostEditorForm.
 *
 * Root cause: `new Date().getTimezoneOffset()` was computed synchronously at the
 * top of the render function. The server (UTC, offset = 0) and the browser
 * (e.g., US Eastern, offset = 300) produce different values for the hidden input
 * `scheduledPublishOffsetMinutes`, which causes React to throw hydration error #418.
 *
 * Fix: initialise the value with useState("") and populate it in a useEffect so
 * that SSR always emits value="" and the real offset is only applied client-side
 * after successful hydration.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: unknown; href: string }) => (
    <a href={href}>{children as React.ReactNode}</a>
  ),
}));

vi.mock("@/app/admin/actions", () => ({
  clonePost: vi.fn(),
  createPostPreviewLinkAction: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  getPostHref: vi.fn(() => "/posts/test"),
}));

vi.mock("@/components/admin/combobox-input", () => ({
  ComboboxInput: () => <div data-testid="combobox-input" />,
}));

vi.mock("@/components/admin/location-autocomplete", () => ({
  LocationAutocomplete: () => <div data-testid="location-autocomplete" />,
}));

vi.mock("@/components/admin/post-media-manager", () => ({
  PostMediaManager: () => <div data-testid="post-media-manager" />,
}));

vi.mock("@/components/admin/post-rich-text-editor", () => ({
  PostRichTextEditor: () => <div data-testid="post-rich-text-editor" />,
}));

vi.mock("@/components/admin/series-selector", () => ({
  SeriesSelector: () => <div data-testid="series-selector" />,
}));

vi.mock("@/components/admin/tag-multi-select", () => ({
  TagMultiSelect: () => <div data-testid="tag-multi-select" />,
}));

vi.mock("@/components/admin/revision-history", () => ({
  RevisionHistory: () => <div data-testid="revision-history" />,
}));

import React from "react";
import { PostEditorForm } from "@/components/admin/post-editor-form";

const noop = () => {};

describe("PostEditorForm hydration safety", () => {
  let originalGetTimezoneOffset: () => number;

  beforeEach(() => {
    originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    // Simulate a non-UTC browser timezone (Eastern Time = UTC-5, offset = +300)
    // so the test is meaningful regardless of the CI server's actual timezone.
    Date.prototype.getTimezoneOffset = () => 300;
  });

  afterEach(() => {
    Date.prototype.getTimezoneOffset = originalGetTimezoneOffset;
    vi.clearAllMocks();
  });

  it("renders scheduledPublishOffsetMinutes as empty string during SSR (create mode)", () => {
    const markup = renderToStaticMarkup(
      <PostEditorForm
        action={noop}
        allSeries={[]}
        allTags={[]}
        categories={[]}
        mode="create"
      />,
    );

    // The hidden input must be present.
    expect(markup).toContain('name="scheduledPublishOffsetMinutes"');

    // CRITICAL: The server-side render must NOT bake the timezone offset into the
    // HTML. If it does, any browser in a non-UTC timezone will see a different
    // value on hydration → React error #418.
    expect(markup).not.toContain('value="300"');

    // The SSR output should emit an empty value so it matches the initial
    // useState("") on the client before the useEffect fires.
    expect(markup).toContain('name="scheduledPublishOffsetMinutes" value=""');
  });

  it("renders scheduledPublishOffsetMinutes as empty string during SSR (edit mode)", () => {
    const markup = renderToStaticMarkup(
      <PostEditorForm
        action={noop}
        allSeries={[]}
        allTags={[]}
        categories={[]}
        mode="edit"
        post={{
          id: "post-abc",
          title: "A test post",
          slug: "a-test-post",
          status: "draft",
          excerpt: null,
          category: null,
          categoryId: null,
          imageUrl: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          publishedAt: null,
          scheduledPublishTime: null,
          viewCount: 0,
          layoutType: "standard",
          contentJson: '{"type":"doc","content":[]}',
          contentFormat: "tiptap-json",
          contentHtml: null,
          contentPlainText: null,
          featuredImageAlt: null,
          seriesId: null,
          seriesTitle: null,
          seriesOrder: null,
          locationName: null,
          locationLat: null,
          locationLng: null,
          locationZoom: null,
          iovanderUrl: null,
          songTitle: null,
          songArtist: null,
          songUrl: null,
          tags: [],
          galleryImages: [],
        } as never}
      />,
    );

    expect(markup).toContain('name="scheduledPublishOffsetMinutes"');
    expect(markup).not.toContain('value="300"');
    expect(markup).toContain('name="scheduledPublishOffsetMinutes" value=""');
  });
});
