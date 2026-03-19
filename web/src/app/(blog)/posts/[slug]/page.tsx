export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthorCard } from "@/components/blog/author-card";
import { BookmarkButton } from "@/components/blog/bookmark-button";
import { Comments } from "@/components/blog/comments";
import { CopyLinkButton } from "@/components/blog/copy-link-button";
import { ShareButtons } from "@/components/blog/share-buttons";
import { PostGallery } from "@/components/blog/post-gallery";
import { PostMap } from "@/components/blog/post-map";
import { ProseContent } from "@/components/blog/prose-content";
import { ReadingProgressBar } from "@/components/blog/reading-progress-bar";
import { PostViewTracker } from "@/components/blog/post-view-tracker";
import { SiteHeader } from "@/components/layout/site-header";
import { htmlToPlainText, processHeadings, sanitizeRichTextHtml } from "@/lib/content";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { getCanonicalPostUrl, getCategoryHref, getTagHref, getPostHref } from "@/lib/utils";
import { PostDate } from "@/components/blog/post-date";
import { getAdminServerSession } from "@/lib/auth/session";
import { getPublicEnv } from "@/lib/env";
import { getPublishedPostBySlug, getRelatedPosts } from "@/server/queries/posts";
import { getSeriesNavForPost } from "@/server/dal/series";
import { SeriesNav } from "@/components/blog/series-nav";
import { getPublicAuthorProfileById } from "@/server/dal/profiles";
import { ScrollToContent } from "@/components/blog/scroll-to-content";
import PostHead from "./head";

type PostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) {
    return {};
  }

  const description = htmlToPlainText(post.description).slice(0, 160);
  const canonical = getCanonicalPostUrl(post);

  return {
    title: post.title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url: canonical,
      images: post.imageUrl ? [{ url: post.imageUrl }] : undefined,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const [post, adminSession] = await Promise.all([
    getPublishedPostBySlug(slug),
    getAdminServerSession(),
  ]);

  if (!post) {
    notFound();
  }

  const isAdmin = adminSession?.user?.role === "admin";
  const sanitized = sanitizeRichTextHtml(post.description);
  const { html: safeDescription, headings } = processHeadings(sanitized);
  const readingTime = Math.max(1, post.readingTimeMinutes ?? 0);
  const { NEXT_PUBLIC_STADIA_MAPS_API_KEY } = getPublicEnv();
  const [relatedPosts, seriesNav, authorProfile] = await Promise.all([
    getRelatedPosts(post, 3),
    getSeriesNavForPost(post.id),
    post.authorId ? getPublicAuthorProfileById(post.authorId) : Promise.resolve(null),
  ]);

  // Extract <img> tags from prose HTML so they can be included in the gallery lightbox.
  // Each inline image gets a data-gallery-idx attribute pointing to its slot in allImages
  // (offset = 1 featured + post_images.length).
  const galleryOffset = (post.imageUrl ? 1 : 0) + post.images.length;
  type InlineImage = { imageUrl: string; altText: string | null };
  const inlineImages: InlineImage[] = [];
  const proseHtml = safeDescription.replace(/<img\b([^>]*)>/gi, (match, attrs: string) => {
    const srcMatch = /src="([^"]*)"/.exec(attrs);
    if (!srcMatch) return match;
    const altMatch = /alt="([^"]*)"/.exec(attrs);
    const idx = galleryOffset + inlineImages.length;
    inlineImages.push({ imageUrl: srcMatch[1], altText: altMatch?.[1] ?? null });
    // Insert data-gallery-idx before the closing >
    return `<img${attrs} data-gallery-idx="${idx}">`;
  });

  const locationData =
    post.locationLat !== null &&
    post.locationLng !== null &&
    NEXT_PUBLIC_STADIA_MAPS_API_KEY
      ? {
          apiKey: NEXT_PUBLIC_STADIA_MAPS_API_KEY,
          lat: post.locationLat,
          lng: post.locationLng,
          zoom: post.locationZoom ?? 10,
          locationName: post.locationName ?? "",
        }
      : null;
  const hasMedia = post.imageUrl || post.images.length > 0;

  const canonicalUrl = getCanonicalPostUrl(post);

  return (
      <main id="main-content" className="min-h-screen pb-16 pt-20 sm:pt-24" style={{ background: "var(--background)" }} tabIndex={-1}>
        <PostHead params={params} />
        <PostViewTracker postId={post.id} />
        <ScrollToContent hasFeaturedImage={Boolean(post.imageUrl)} />
        <ReadingProgressBar />
        <SiteHeader />

        <div className="container mx-auto mt-4 max-w-4xl px-4 sm:mt-6 sm:px-6 lg:px-8">
          {/* Breadcrumb + admin edit */}
          <div className="mb-4 flex items-center justify-between gap-4">
          <nav className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-sm text-[var(--text-secondary)]">
            <Link className="font-medium text-[var(--accent)] hover:underline" href="/">Home</Link>
            <span className="text-[var(--border)]">/</span>
            {post.category ? (
              <>
                <Link className="font-medium text-[var(--accent)] hover:underline" href={getCategoryHref(post.category)}>{post.category}</Link>
                <span className="text-[var(--border)]">/</span>
              </>
            ) : null}
            <span className="text-[var(--text-primary)] font-medium truncate max-w-[18ch]">{post.title}</span>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {!isAdmin ? <BookmarkButton postId={post.id} /> : null}
            {isAdmin ? (
              <Link
                className="rounded-full border border-[var(--primary)] px-3 py-1 text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-[var(--on-primary)]"
                href={`/admin/posts/${post.id}/edit`}
              >
                Edit post
              </Link>
            ) : null}
          </div>
          </div>

          {/* Article card */}
          <article id="article-top" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-2xl">

          {/* Hero image + gallery — full-width at top of card */}
          {hasMedia ? (
            <PostGallery
              featuredImageUrl={post.imageUrl}
              images={post.images}
              inlineImages={inlineImages.length > 0 ? inlineImages : undefined}
              postTitle={post.title}
            />
          ) : null}

          {/* Article header */}
          <div className="px-5 pb-6 pt-7 sm:px-10 sm:pt-9">

            {/* Meta row */}
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

            {/* Title */}
            <h1 className="mt-3 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            {/* Tags */}
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

          {/* Divider */}
          <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent sm:mx-10" />

          {/* Prose content */}
          <div className="px-5 py-9 sm:px-10">
            <div className="mx-auto max-w-[68ch]">
              {seriesNav ? <SeriesNav nav={seriesNav} /> : null}
              {headings.length >= 2 ? <TableOfContents headings={headings} /> : null}
              <ProseContent
                className="prose-content text-[1.0625rem] leading-[1.85]"
                html={proseHtml}
              />
            </div>
          </div>

          {/* Location map */}
          {locationData ? (
            <div className="border-t border-[var(--border)] px-5 py-8 sm:px-10">
              <PostMap
                apiKey={locationData.apiKey}
                iovanderUrl={post.iovanderUrl}
                lat={locationData.lat}
                lng={locationData.lng}
                locationName={locationData.locationName}
                zoom={locationData.zoom}
              />
            </div>
          ) : null}

          {/* Author bio */}
          {authorProfile ? (
            <div className="border-t border-[var(--border)] px-5 py-8 sm:px-10">
              <AuthorCard author={authorProfile} />
            </div>
          ) : null}

          {/* Comments */}
          <div className="border-t border-[var(--border)] px-5 pb-10 sm:px-10">
            <Comments postId={post.id} />
          </div>

          {/* Keep exploring CTA */}
          <div className="border-t border-[var(--border)] bg-gradient-to-br from-[var(--accent-soft)] to-transparent px-5 py-8 sm:px-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Keep exploring</p>
                <h2 className="mt-1.5 text-xl font-bold text-[var(--text-primary)] sm:text-2xl">Carry the trail forward.</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">Every story leads to the next. Pick up where this one left off.</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3 self-start sm:self-auto">
                <ShareButtons title={post.title} url={canonicalUrl} />
                <CopyLinkButton url={canonicalUrl} />
                <Link
                  className="btn-primary rounded-full px-6 py-2.5 text-sm font-bold shadow-md transition-transform hover:-translate-y-0.5"
                  href="/"
                >
                  More stories →
                </Link>
              </div>
            </div>
          </div>

          </article>
        </div>

        {/* Related posts */}
        {relatedPosts.length > 0 ? (
          <section className="container mx-auto mt-12 max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Related stories</p>
                <h2 className="mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">Keep the trail going</h2>
              </div>
              <Link className="text-sm font-semibold text-[var(--accent)] hover:underline" href="/">All stories →</Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  href={getPostHref(relatedPost)}
                >
                  {relatedPost.imageUrl ? (
                    <div className="relative aspect-[5/3] w-full overflow-hidden">
                      <Image
                        alt={relatedPost.title}
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        fill
                        loading="lazy"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        src={relatedPost.imageUrl}
                      />
                    </div>
                  ) : (
                    <div className="aspect-[5/3] w-full bg-gradient-to-br from-[var(--accent-soft)] to-[var(--background)]" />
                  )}
                  <div className="flex flex-col p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">{relatedPost.category ?? "Adventure"}</p>
                    <h3 className="mt-2 text-balance text-base font-bold leading-snug text-[var(--text-primary)] sm:text-lg">{relatedPost.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {htmlToPlainText(relatedPost.excerpt ?? relatedPost.description ?? "").slice(0, 120)}
                    </p>
                    <span className="mt-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--accent)]">Read story →</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
  );
}
