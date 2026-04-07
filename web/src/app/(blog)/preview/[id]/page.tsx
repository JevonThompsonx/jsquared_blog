export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthorCard } from "@/components/blog/author-card";
import { PostGallery } from "@/components/blog/post-gallery";
import { PostMap } from "@/components/blog/post-map";
import { PostSongMetadata } from "@/components/blog/post-song-metadata";
import { ProseContent } from "@/components/blog/prose-content";
import { ReadingProgressBar } from "@/components/blog/reading-progress-bar";
import { SeriesNav } from "@/components/blog/series-nav";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { PostDate } from "@/components/blog/post-date";
import { SiteHeader } from "@/components/layout/site-header";
import { processHeadings, sanitizeRichTextHtml } from "@/lib/content";
import { requireAdminSession } from "@/lib/auth/session";
import { getPublicEnv } from "@/lib/env";
import { getCategoryHref, getTagHref } from "@/lib/utils";
import { getSeriesNavForPost } from "@/server/dal/series";
import { getPublicAuthorProfileById } from "@/server/dal/profiles";
import { validatePostPreviewToken } from "@/server/posts/preview";
import { getPostForPreview } from "@/server/queries/posts";

type PreviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ token?: string }>;
};

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PreviewPage({ params, searchParams }: PreviewPageProps) {
  const [{ id }, resolvedSearchParams, adminSession] = await Promise.all([
    params,
    searchParams,
    requireAdminSession(),
  ]);

  const previewToken = resolvedSearchParams?.token?.trim() ?? "";
  const hasValidToken = previewToken ? await validatePostPreviewToken(id, previewToken) : false;

  if (!adminSession && !hasValidToken) {
    notFound();
  }

  const post = await getPostForPreview(id);
  if (!post) {
    notFound();
  }

  const sanitized = sanitizeRichTextHtml(post.description);
  const { html: safeDescription, headings } = processHeadings(sanitized);
  const readingTime = Math.max(1, post.readingTimeMinutes ?? 0);
  const { NEXT_PUBLIC_STADIA_MAPS_API_KEY } = getPublicEnv();
  const [seriesNav, authorProfile] = await Promise.all([
    getSeriesNavForPost(post.id),
    post.authorId ? getPublicAuthorProfileById(post.authorId) : Promise.resolve(null),
  ]);

  const galleryOffset = (post.imageUrl ? 1 : 0) + post.images.length;
  type InlineImage = { imageUrl: string; altText: string | null };
  const inlineImages: InlineImage[] = [];
  const proseHtml = safeDescription.replace(/<img\b([^>]*)>/gi, (match, attrs: string) => {
    const srcMatch = /src="([^"]*)"/.exec(attrs);
    if (!srcMatch) return match;
    const altMatch = /alt="([^"]*)"/.exec(attrs);
    const idx = galleryOffset + inlineImages.length;
    inlineImages.push({ imageUrl: srcMatch[1], altText: altMatch?.[1] ?? null });
    return `<img${attrs} data-gallery-idx="${idx}">`;
  });

  const hasMedia = post.imageUrl || post.images.length > 0;

  const statusLabel = post.status === "draft" ? "Draft" : post.status === "scheduled" ? "Scheduled" : "Published";

  return (
    <main id="main-content" className="min-h-screen pb-16 pt-20 sm:pt-24" style={{ background: "var(--background)" }} tabIndex={-1}>
      <ReadingProgressBar />
      <SiteHeader />

      {/* Preview banner */}
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-sm shadow-sm backdrop-blur-md sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview Mode
          </span>
          <span className="hidden h-4 w-px bg-[var(--border)] sm:block" />
          <span
            className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.12em]"
            style={{
              borderColor: post.status === "published" ? "var(--primary)" : "var(--border)",
              color: post.status === "published" ? "var(--primary)" : "var(--text-secondary)",
              backgroundColor: post.status === "published" ? "var(--primary-soft)" : "transparent",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: post.status === "published" ? "var(--primary)" : "currentColor",
              }}
            />
            {statusLabel}
          </span>
          <span className="hidden text-xs text-[var(--text-secondary)] sm:block">
            {post.status === "published" ? "Viewing live post data" : "This post is not publicly visible"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className="flex items-center gap-1.5 rounded-full border border-[var(--primary)] px-4 py-1.5 text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-[var(--on-primary)]"
            href={`/admin/posts/${post.id}/edit`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Post
          </Link>
        </div>
      </div>

      <div className="container mx-auto mt-4 max-w-4xl px-4 sm:mt-6 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-sm text-[var(--text-secondary)]">
          <Link className="font-medium text-[var(--accent)] hover:underline" href="/admin">Admin</Link>
          <span className="text-[var(--border)]">/</span>
          {post.category ? (
            <>
              <Link className="font-medium text-[var(--accent)] hover:underline" href={getCategoryHref(post.category)}>{post.category}</Link>
              <span className="text-[var(--border)]">/</span>
            </>
          ) : null}
          <span className="truncate max-w-[18ch] font-medium text-[var(--text-primary)]">{post.title}</span>
        </div>

        {/* Article card */}
        <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-2xl">

          {hasMedia ? (
            <PostGallery
              featuredImageUrl={post.imageUrl}
              images={post.images}
              inlineImages={inlineImages.length > 0 ? inlineImages : undefined}
              postTitle={post.title}
            />
          ) : null}

          <div className="px-5 pb-6 pt-7 sm:px-10 sm:pt-9">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[var(--text-secondary)]">
              {post.category ? (
                <Link
                  className="font-semibold uppercase tracking-[0.14em] text-[var(--accent)] text-xs hover:underline"
                  href={getCategoryHref(post.category)}
                >
                  {post.category}
                </Link>
              ) : null}
              {post.category ? <span className="text-[var(--border)]">·</span> : null}
              <PostDate className="tabular-nums" dateString={post.createdAt} />
              <span className="text-[var(--border)]">·</span>
              <span>{readingTime} min read</span>
              <span className="text-[var(--border)]">·</span>
              <span>{post.viewCount ?? 0} views</span>
            </div>

            <h1 className="mt-3 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            {post.tags.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent-soft)]"
                    href={getTagHref(tag.slug)}
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent sm:mx-10" />

          <div className="px-5 py-9 sm:px-10">
            <div className="mx-auto max-w-[68ch]">
              {seriesNav ? <SeriesNav nav={seriesNav} /> : null}
              {headings.length >= 2 ? <TableOfContents headings={headings} /> : null}
              <PostSongMetadata song={post.song ?? null} />
              <ProseContent
                className="prose-content text-[1.0625rem] leading-[1.85]"
                html={proseHtml}
              />
            </div>
          </div>

          {post.locationLat !== null && post.locationLng !== null && NEXT_PUBLIC_STADIA_MAPS_API_KEY ? (
            <div className="border-t border-[var(--border)] px-5 py-8 sm:px-10">
              <PostMap
                apiKey={NEXT_PUBLIC_STADIA_MAPS_API_KEY}
                iovanderUrl={post.iovanderUrl}
                lat={post.locationLat}
                lng={post.locationLng}
                locationName={post.locationName ?? ""}
                zoom={post.locationZoom ?? 10}
              />
            </div>
          ) : null}

          {authorProfile ? (
            <div className="border-t border-[var(--border)] px-5 py-8 sm:px-10">
              <AuthorCard author={authorProfile} />
            </div>
          ) : null}

        </article>
      </div>
    </main>
  );
}
