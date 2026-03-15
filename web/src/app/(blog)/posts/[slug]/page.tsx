export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Comments } from "@/components/blog/comments";
import { PostGallery } from "@/components/blog/post-gallery";
import { SiteHeader } from "@/components/layout/site-header";
import { htmlToPlainText, sanitizeRichTextHtml } from "@/lib/content";
import { formatPublishedDate, getCanonicalPostUrl, getCategoryHref, getTagHref, getPostHref } from "@/lib/utils";
import { getAdminServerSession } from "@/lib/auth/session";
import { getPublishedPostBySlug, listPublishedPosts } from "@/server/queries/posts";

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
  const safeDescription = sanitizeRichTextHtml(post.description);
  const readingTime = Math.max(1, Math.ceil(htmlToPlainText(post.description).split(/\s+/).filter(Boolean).length / 220));
  const relatedPosts = (await listPublishedPosts(6)).filter((entry) => entry.slug !== post.slug).slice(0, 3);
  const hasMedia = post.imageUrl || post.images.length > 0;

  return (
    <main className="min-h-screen pb-16 pt-20 sm:pt-24" style={{ background: "var(--background)" }}>
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
          {isAdmin ? (
            <Link
              className="shrink-0 rounded-full border border-[var(--primary)] px-3 py-1 text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-white"
              href={`/admin/posts/${post.id}/edit`}
            >
              Edit post
            </Link>
          ) : null}
        </div>

        {/* Article card */}
        <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-2xl">

          {/* Hero image + gallery — full-width at top of card */}
          {hasMedia ? (
            <PostGallery
              featuredImageUrl={post.imageUrl}
              images={post.images}
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
              <time className="tabular-nums" dateTime={post.createdAt}>{formatPublishedDate(post.createdAt)}</time>
              <span className="text-[var(--border)]">·</span>
              <span>{readingTime} min read</span>
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
            <div
              className="prose-content mx-auto max-w-[68ch] text-[1.0625rem] leading-[1.85]"
              dangerouslySetInnerHTML={{ __html: safeDescription }}
            />
          </div>

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
              <Link
                className="shrink-0 self-start rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 sm:self-auto"
                href="/"
              >
                More stories →
              </Link>
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
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    alt={relatedPost.title}
                    className="aspect-[5/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    src={relatedPost.imageUrl}
                  />
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
