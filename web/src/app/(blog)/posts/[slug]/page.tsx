export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { htmlToPlainText, sanitizeRichTextHtml } from "@/lib/content";
import { formatPublishedDate, getCanonicalPostUrl } from "@/lib/utils";
import { getPublishedPostBySlug } from "@/server/queries/posts";

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

  return (
    <main className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
      <SiteHeader />

      <article className="container mx-auto mt-10 max-w-4xl rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl sm:p-8">
        <Link className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)]" href="/">
          Back to stories
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
          {post.category ? <span>{post.category}</span> : null}
          <span>•</span>
          <time dateTime={post.createdAt}>{formatPublishedDate(post.createdAt)}</time>
        </div>

        <h1 className="mt-4 text-4xl font-semibold leading-tight text-[var(--foreground)] sm:text-5xl">{post.title}</h1>

        {post.imageUrl ? (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[1.5rem]">
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
      </article>
    </main>
  );
}
