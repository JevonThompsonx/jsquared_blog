/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import type { BlogPost } from "@/types/blog";
import { formatPublishedDate, getPostHref, htmlToPlainText } from "@/lib/utils";

function isNewPost(dateString: string): boolean {
  const postDate = new Date(dateString);
  const now = new Date();
  return (now.getTime() - postDate.getTime()) / (1000 * 60 * 60) < 24;
}

export function HomePostCard({ post }: { post: BlogPost }) {
  const image = post.imageUrl || "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found";
  const category = post.category || "General";
  const description = htmlToPlainText(post.description || post.excerpt || "");
  const overlayDescription = description.length > 132 ? `${description.slice(0, 129).trimEnd()}...` : description;
  const isNew = post.status === "published" && isNewPost(post.createdAt);
  const layoutType = post.layoutType ?? "split-vertical";
  const gridClass = layoutType === "split-horizontal" ? "col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2" : "col-span-1";
  const visibleTags = post.tags.slice(0, 3);
  const statusBadge = post.status && post.status !== "published" ? post.status.toUpperCase() : isNew ? "NEW" : null;
  const overlayDensity = visibleTags.length > 0 || overlayDescription.length > 88 || Boolean(statusBadge) ? "grounded" : "airy";
  const cardDescription = description.length > 170 ? `${description.slice(0, 167).trimEnd()}...` : description;

  if (layoutType === "hover") {
    return (
      <div className={gridClass}>
        <div className="card-overlay group relative block min-h-[22rem] h-full overflow-hidden rounded-lg shadow-lg sm:min-h-[24rem]" data-overlay-density={overlayDensity}>
          <img alt={post.title} className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105" loading="lazy" src={image} />
          <div className="absolute right-2 top-2 z-[2] flex gap-2">
            {statusBadge ? <div className="rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-white backdrop-blur-sm">{statusBadge}</div> : null}
          </div>
          <div className="card-overlay-content">
            <span className="card-overlay-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">{category}</span>
            {visibleTags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {visibleTags.map((tag) => (
                  <span key={tag.id} className="card-overlay-chip rounded-full px-2 py-0.5 text-xs backdrop-blur-sm">
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : null}
            <Link className="card-overlay-title mt-1 block text-lg font-bold leading-tight md:text-xl" href={getPostHref(post)}>
              {post.title}
            </Link>
            <p className="card-overlay-body text-sm opacity-95 transition-all duration-300 ease-in-out sm:max-h-0 sm:overflow-hidden sm:opacity-0 sm:group-hover:max-h-24 sm:group-hover:opacity-100">{overlayDescription}</p>
            <div className="card-overlay-footer">
              <div className="card-overlay-meta text-xs">{formatPublishedDate(post.createdAt)}</div>
              <span className="card-overlay-link">Read story</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (layoutType === "split-horizontal") {
    return (
      <div className={gridClass}>
        <div className="post-card-shell group relative flex h-full flex-col overflow-hidden rounded-lg border shadow-lg transition-all duration-300 md:flex-row">
          {statusBadge ? <div className="absolute right-3 top-3 z-10 rounded-full bg-[var(--card-bg)] px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-[var(--primary)] shadow-md">{statusBadge}</div> : null}
          <div className="h-64 md:h-auto md:w-1/2">
            <img alt={post.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" src={image} />
          </div>
          <div className="post-card-panel flex flex-col justify-between p-4 md:w-1/2 md:p-6">
            <div>
              <span className="post-card-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">{category}</span>
              {visibleTags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {visibleTags.map((tag) => (
                    <span key={tag.id} className="post-card-chip rounded-full px-2 py-0.5 text-xs">
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : null}
              <Link className="post-card-title mt-1 block text-lg font-bold leading-tight transition-colors md:text-xl" href={getPostHref(post)}>
                {post.title}
              </Link>
              <p className="post-card-description mt-2 max-w-[36ch] text-sm">{cardDescription}</p>
              <span className="post-card-link mt-3 inline-flex items-center gap-1 text-sm font-medium transition-all duration-200 group-hover:gap-2">Continue reading</span>
            </div>
            <div className="post-card-date mt-4 text-xs">{formatPublishedDate(post.createdAt)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      <div className="post-card-shell group relative flex h-full flex-col overflow-hidden rounded-lg border shadow-lg transition-all duration-300">
        {statusBadge ? <div className="absolute right-3 top-3 z-10 rounded-full bg-[var(--card-bg)] px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-[var(--primary)] shadow-md">{statusBadge}</div> : null}
        <div className="h-56 sm:h-60">
          <img alt={post.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" src={image} />
        </div>
        <div className="post-card-panel flex flex-grow flex-col p-4 md:p-6">
          <span className="post-card-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">{category}</span>
          {visibleTags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <span key={tag.id} className="post-card-chip rounded-full px-2 py-0.5 text-xs">
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
          <Link className="post-card-title mt-1 block text-lg font-bold leading-tight transition-colors" href={getPostHref(post)}>
            {post.title}
          </Link>
          <p className="post-card-description mt-2 flex-grow max-w-[36ch] text-sm">{cardDescription}</p>
          <span className="post-card-link mt-3 inline-flex items-center gap-1 text-sm font-medium transition-all duration-200 group-hover:gap-2">Continue reading</span>
          <p className="post-card-date mt-4 self-start text-xs">{formatPublishedDate(post.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}
