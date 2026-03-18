import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { BlogPost } from "@/types/blog";
import { getCategoryHref, getPostHref, getTagHref, htmlToPlainText } from "@/lib/utils";
import { PostDate } from "@/components/blog/post-date";
import { cdnBlurDataUrl } from "@/lib/cloudinary/transform";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSearchTerms(search?: string): string[] {
  if (!search) {
    return [];
  }

  return [...new Set(search.trim().split(/\s+/).filter(Boolean).map((term) => term.toLowerCase()))].sort(
    (a, b) => b.length - a.length,
  );
}

function isNewPost(dateString: string): boolean {
  const postDate = new Date(dateString);
  const now = new Date();
  return (now.getTime() - postDate.getTime()) / (1000 * 60 * 60) < 24;
}

function Highlight({ text, search }: { text: string; search?: string }): ReactNode {
  const searchTerms = getSearchTerms(search);
  if (searchTerms.length === 0) {
    return <>{text}</>;
  }

  const matcher = new RegExp(`(${searchTerms.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(matcher);
  const normalizedTerms = new Set(searchTerms);

  return (
    <>
      {parts.map((part, i) =>
        normalizedTerms.has(part.toLowerCase()) ? (
          <mark key={i}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function HomePostCard({ 
  post, 
  priority = false, 
  searchTerm 
}: { 
  post: BlogPost; 
  priority?: boolean;
  searchTerm?: string; 
}) {
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
  const href = getPostHref(post);

  if (layoutType === "hover") {
    return (
      <div className={`${gridClass} group relative`}>
        <Link aria-label={`Read post: ${post.title}`} className="absolute inset-0 z-[1] rounded-lg focus:outline-2 focus:outline-[var(--primary)]" href={href} tabIndex={-1} />
        <article className="card-overlay relative block h-full min-h-[22rem] overflow-hidden rounded-lg shadow-lg bg-[var(--accent-soft)] sm:min-h-[24rem]" data-overlay-density={overlayDensity}>
          <Image 
            alt={post.title} 
            className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105" 
            fill 
            loading={priority ? undefined : "lazy"} 
            priority={priority}
            src={image} 
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw" 
            placeholder={cdnBlurDataUrl(image) ? "blur" : "empty"} 
            blurDataURL={cdnBlurDataUrl(image)} 
          />
          <div className="absolute right-2 top-2 z-[2] flex gap-2">
            {statusBadge ? <div className="rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-white backdrop-blur-sm">{statusBadge}</div> : null}
          </div>
          <div className="card-overlay-content">
            <Link className="card-overlay-kicker relative z-[2] inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" href={getCategoryHref(category)}>{category}</Link>
            {visibleTags.length > 0 ? (
              <div className="relative z-[2] mt-2 flex flex-wrap gap-1.5">
                {visibleTags.map((tag) => (
                  <Link key={tag.id} className="card-overlay-chip rounded-full px-2 py-0.5 text-xs backdrop-blur-sm" href={getTagHref(tag.slug)}>
                    {tag.name}
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="card-overlay-title mt-1 block text-lg font-bold leading-tight md:text-xl">
              <Highlight search={searchTerm} text={post.title} />
            </div>
            <p className="card-overlay-body text-sm opacity-95 transition-all duration-300 ease-in-out sm:max-h-0 sm:overflow-hidden sm:opacity-0 sm:group-hover:max-h-24 sm:group-hover:opacity-100">
              <Highlight search={searchTerm} text={overlayDescription} />
            </p>
            <div className="card-overlay-footer">
              <div className="flex flex-wrap items-center gap-2">
                <PostDate className="card-overlay-meta text-xs" dateString={post.createdAt} />
                {post.readingTimeMinutes ? (
                  <>
                    <span aria-hidden="true" className="card-overlay-meta text-xs opacity-50">·</span>
                    <span className="card-overlay-meta text-xs">{post.readingTimeMinutes} min read</span>
                  </>
                ) : null}
                {post.commentCount > 0 ? (
                  <>
                    <span aria-hidden="true" className="card-overlay-meta text-xs opacity-50">·</span>
                    <span className="card-overlay-meta flex items-center gap-1 text-xs">
                      <svg aria-hidden="true" className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M18 10c0 3.866-3.582 7-8 7a8.84 8.84 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" fillRule="evenodd" /></svg>
                      {post.commentCount}
                    </span>
                  </>
                ) : null}
              </div>
              <span className="card-overlay-link">Read story <span aria-hidden="true">→</span></span>
            </div>
          </div>
        </article>
      </div>
    );
  }

  if (layoutType === "split-horizontal") {
    return (
      <div className={`${gridClass} group relative`}>
        <Link aria-label={`Read post: ${post.title}`} className="absolute inset-0 z-[1] rounded-lg focus:outline-2 focus:outline-[var(--primary)]" href={href} tabIndex={-1} />
        <article className="post-card-shell relative flex h-full flex-col overflow-hidden rounded-lg border shadow-lg transition-all duration-300 md:flex-row bg-[var(--card-bg)]">
          {statusBadge ? <div className="absolute right-3 top-3 z-10 rounded-full bg-[var(--card-bg)] px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-[var(--primary)] shadow-md">{statusBadge}</div> : null}
          <div className="relative h-64 overflow-hidden md:h-auto md:min-h-[240px] md:w-1/2 bg-[var(--accent-soft)]">
            <Image 
              alt={post.title} 
              className="object-cover transition-transform duration-300 group-hover:scale-105" 
              fill 
              loading={priority ? undefined : "lazy"} 
              priority={priority}
              src={image} 
              sizes="(max-width: 768px) 100vw, 50vw" 
              placeholder={cdnBlurDataUrl(image) ? "blur" : "empty"} 
              blurDataURL={cdnBlurDataUrl(image)} 
            />
          </div>
          <div className="post-card-panel flex flex-col justify-between p-4 md:w-1/2 md:p-6">
            <div>
              <Link className="post-card-kicker relative z-[2] inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" href={getCategoryHref(category)}>{category}</Link>
              {visibleTags.length > 0 ? (
                <div className="relative z-[2] mt-2 flex flex-wrap gap-1.5">
                  {visibleTags.map((tag) => (
                    <Link key={tag.id} className="post-card-chip rounded-full px-2 py-0.5 text-xs" href={getTagHref(tag.slug)}>
                      {tag.name}
                    </Link>
                  ))}
                </div>
              ) : null}
              <div className="post-card-title mt-1 block text-lg font-bold leading-tight transition-colors md:text-xl">
                <Highlight search={searchTerm} text={post.title} />
              </div>
              <p className="post-card-description mt-2 max-w-[36ch] text-sm">
                <Highlight search={searchTerm} text={cardDescription} />
              </p>
              {description.length > 170 ? (
                <span className="post-card-link mt-3 inline-flex items-center gap-1 text-sm font-medium transition-all duration-200 group-hover:gap-2">Continue reading <span aria-hidden="true">→</span></span>
              ) : null}
            </div>
             <div className="mt-4 flex flex-wrap items-center gap-2">
              <PostDate className="post-card-date text-xs" dateString={post.createdAt} />
              {post.readingTimeMinutes ? (
                <>
                  <span aria-hidden="true" className="post-card-date text-xs opacity-50">·</span>
                  <span className="post-card-date text-xs">{post.readingTimeMinutes} min read</span>
                </>
              ) : null}
              {post.commentCount > 0 ? (
                <>
                  <span aria-hidden="true" className="post-card-date text-xs opacity-50">·</span>
                  <span className="post-card-date flex items-center gap-1 text-xs">
                    <svg aria-hidden="true" className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M18 10c0 3.866-3.582 7-8 7a8.84 8.84 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" fillRule="evenodd" /></svg>
                    {post.commentCount}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className={`${gridClass} group relative`}>
      <Link aria-label={`Read post: ${post.title}`} className="absolute inset-0 z-[1] rounded-lg focus:outline-2 focus:outline-[var(--primary)]" href={href} tabIndex={-1} />
      <article className="post-card-shell relative flex h-full flex-col overflow-hidden rounded-lg border shadow-lg transition-all duration-300">
        {statusBadge ? <div className="absolute right-3 top-3 z-10 rounded-full bg-[var(--card-bg)] px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-[var(--primary)] shadow-md">{statusBadge}</div> : null}
        <div className="relative h-56 overflow-hidden sm:h-60 bg-[var(--accent-soft)]">
          <Image 
            alt={post.title} 
            className="object-cover transition-transform duration-300 group-hover:scale-105" 
            fill 
            loading={priority ? undefined : "lazy"} 
            priority={priority}
            src={image} 
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw" 
            placeholder={cdnBlurDataUrl(image) ? "blur" : "empty"} 
            blurDataURL={cdnBlurDataUrl(image)} 
          />
        </div>
        <div className="post-card-panel flex flex-grow flex-col p-4 md:p-6">
          <Link className="post-card-kicker relative z-[2] inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" href={getCategoryHref(category)}>{category}</Link>
          {visibleTags.length > 0 ? (
            <div className="relative z-[2] mt-2 flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <Link key={tag.id} className="post-card-chip rounded-full px-2 py-0.5 text-xs" href={getTagHref(tag.slug)}>
                  {tag.name}
                </Link>
              ))}
            </div>
          ) : null}
          <div className="post-card-title mt-1 block text-lg font-bold leading-tight transition-colors">
            <Highlight search={searchTerm} text={post.title} />
          </div>
          <p className="post-card-description mt-2 flex-grow max-w-[36ch] text-sm">
            <Highlight search={searchTerm} text={cardDescription} />
          </p>
          {description.length > 170 ? (
            <span className="post-card-link mt-3 inline-flex items-center gap-1 text-sm font-medium transition-all duration-200 group-hover:gap-2">Continue reading <span aria-hidden="true">→</span></span>
          ) : null}
           <div className="mt-4 flex flex-wrap items-center gap-2 self-start">
            <PostDate className="post-card-date text-xs" dateString={post.createdAt} />
            {post.readingTimeMinutes ? (
              <>
                <span aria-hidden="true" className="post-card-date text-xs opacity-50">·</span>
                <span className="post-card-date text-xs">{post.readingTimeMinutes} min read</span>
              </>
            ) : null}
            {post.commentCount > 0 ? (
              <>
                <span aria-hidden="true" className="post-card-date text-xs opacity-50">·</span>
                <span className="post-card-date flex items-center gap-1 text-xs">
                  <svg aria-hidden="true" className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M18 10c0 3.866-3.582 7-8 7a8.84 8.84 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" fillRule="evenodd" /></svg>
                  {post.commentCount}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}
