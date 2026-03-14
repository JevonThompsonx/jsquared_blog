export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { htmlToPlainText, sanitizeRichTextHtml } from "@/lib/content";
import { formatPublishedDate, getCanonicalPostUrl } from "@/lib/utils";
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
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const safeDescription = sanitizeRichTextHtml(post.description);
  const readingTime = Math.max(1, Math.ceil(htmlToPlainText(post.description).split(/\s+/).filter(Boolean).length / 220));
  const relatedPosts = (await listPublishedPosts(6)).filter((entry) => entry.slug !== post.slug).slice(0, 3);

  return (
    <main className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
      <SiteHeader />

      <article className="container mx-auto mt-8 max-w-4xl rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:mt-10 sm:p-8">
        <nav className="overflow-x-auto whitespace-nowrap pb-1 text-sm text-[var(--text-secondary)]">
          <Link className="font-semibold text-[var(--accent)]" href="/">
            Home
          </Link>
          <span className="mx-2">/</span>
          {post.category ? <span>{post.category}</span> : null}
          <span className="mx-2">/</span>
          <span className="text-[var(--text-primary)]">{post.title}</span>
        </nav>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
          {post.category ? <span>{post.category}</span> : null}
          <span>•</span>
          <time dateTime={post.createdAt}>{formatPublishedDate(post.createdAt)}</time>
          <span>•</span>
          <span>{readingTime} min read</span>
        </div>

        <h1 className="mt-4 text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-5xl">{post.title}</h1>

        {post.tags.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag.id} className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                {tag.name}
              </span>
            ))}
          </div>
        ) : null}

        {post.imageUrl ? (
          <div className="relative mt-8 aspect-[4/3] overflow-hidden rounded-[1.25rem] sm:aspect-[16/9] sm:rounded-[1.5rem]">
            <Image
              alt={post.title}
              className="object-cover"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              src={post.imageUrl}
            />
          </div>
        ) : null}

        <div
          className="prose-content mt-8"
          dangerouslySetInnerHTML={{ __html: safeDescription }}
        />

        <div className="mt-10 grid gap-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Keep exploring</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Carry the trail forward with another story.</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">This site works best as a flowing journal, not a social feed. When you finish one trip, the next should already be waiting.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <Link className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white" href="/">
              More stories
            </Link>
          </div>
        </div>
      </article>

      {relatedPosts.length > 0 ? (
        <section className="container mx-auto mt-10 max-w-5xl">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Related stories</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">Keep the trail going</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {relatedPosts.map((relatedPost) => (
              <Link key={relatedPost.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-lg transition-transform duration-300 hover:-translate-y-1" href={`/posts/${relatedPost.slug}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">{relatedPost.category ?? "Adventure"}</p>
                <h3 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">{relatedPost.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{htmlToPlainText(relatedPost.excerpt ?? relatedPost.description).slice(0, 140)}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
