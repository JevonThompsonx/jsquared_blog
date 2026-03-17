export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { PostDate } from "@/components/blog/post-date";
import { getSeriesBySlug, listPublishedPostsInSeries } from "@/server/dal/series";
import { getPostHref } from "@/lib/utils";

type SeriesPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: SeriesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSeriesBySlug(slug);
  if (!s) return {};
  return {
    title: s.title,
    description: s.description ?? `All posts in the ${s.title} series.`,
  };
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { slug } = await params;
  const s = await getSeriesBySlug(slug);
  if (!s) notFound();

  const seriesPosts = await listPublishedPostsInSeries(s.id);

  return (
    <main className="min-h-screen pb-20 pt-20 sm:pt-24" style={{ background: "var(--background)" }}>
      <SiteHeader />

      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mt-8 sm:mt-10">
          <Link className="text-xs font-semibold text-[var(--accent)] hover:underline" href="/">← All stories</Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Series</p>
          <h1 className="mt-1.5 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">{s.title}</h1>
          {s.description ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">{s.description}</p>
          ) : null}
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{seriesPosts.length} {seriesPosts.length === 1 ? "part" : "parts"}</p>
        </div>

        {/* Parts list */}
        {seriesPosts.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-10 text-center shadow-lg">
            <p className="text-lg font-bold text-[var(--text-primary)]">No published posts yet</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Check back soon — this series is in progress.</p>
          </div>
        ) : (
          <ol className="mt-8 space-y-4">
            {seriesPosts.map((post, i) => {
              const partNumber = post.seriesOrder ?? i + 1;
              const dateStr = (post.publishedAt ?? post.createdAt).toISOString();
              return (
                <li key={post.id}>
                  <Link
                    className="group flex gap-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                    href={getPostHref(post)}
                  >
                    {/* Part number badge */}
                    <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-[var(--border)] bg-[var(--accent-soft)] py-5 sm:w-20">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Part</span>
                      <span className="text-2xl font-bold text-[var(--primary)] sm:text-3xl">{partNumber}</span>
                    </div>

                    {/* Post info */}
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-5 pr-5">
                      <h2 className="text-balance text-base font-bold leading-snug text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)] sm:text-lg">
                        {post.title}
                      </h2>
                      {post.excerpt ? (
                        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">{post.excerpt}</p>
                      ) : null}
                      <PostDate className="mt-1 text-xs text-[var(--text-secondary)]" dateString={dateStr} />
                    </div>

                    {/* Thumbnail */}
                    {post.imageUrl ? (
                      <Image
                        alt={post.title}
                        className="hidden h-full w-32 shrink-0 object-cover sm:block"
                        height={96}
                        src={post.imageUrl}
                        width={128}
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
