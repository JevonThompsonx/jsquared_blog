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
  const isNew = post.status === "published" && isNewPost(post.createdAt);
  const layoutType = post.layoutType ?? "split-vertical";
  const gridClass = layoutType === "split-horizontal" ? "col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2" : "col-span-1";

  if (layoutType === "hover") {
    return (
      <div className={gridClass}>
        <div className="group relative block h-full overflow-hidden rounded-lg shadow-lg">
          <img alt={post.title} className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105" loading="lazy" src={image} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
          <div className="absolute right-2 top-2 flex gap-2">
            {isNew ? <div className="animate-pulse rounded bg-green-500 px-2 py-1 text-xs font-bold text-white">NEW</div> : null}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--primary-light)]">{category}</span>
            <Link className="mt-1 block text-lg font-bold leading-tight text-white md:text-xl" href={getPostHref(post)}>
              {post.title}
            </Link>
            <div className="mt-2 text-xs text-gray-300">{formatPublishedDate(post.createdAt)}</div>
            <p className="mt-2 max-h-0 overflow-hidden text-sm text-gray-200 opacity-0 transition-all duration-300 ease-in-out group-hover:max-h-20 group-hover:opacity-100">{description}</p>
          </div>
        </div>
      </div>
    );
  }

  if (layoutType === "split-horizontal") {
    return (
      <div className={gridClass}>
        <div className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-lg transition-all duration-300 hover:border-[var(--primary)] hover:shadow-xl md:flex-row">
          <div className="md:w-1/2 h-64 md:h-auto">
            <img alt={post.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" src={image} />
          </div>
          <div className="flex flex-col justify-between p-4 md:w-1/2 md:p-6">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">{category}</span>
              <Link className="mt-1 block text-lg font-bold leading-tight text-[var(--text-primary)] transition-colors hover:text-[var(--primary)] md:text-xl" href={getPostHref(post)}>
                {post.title}
              </Link>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] transition-all duration-200 group-hover:gap-2">Continue reading</span>
            </div>
            <div className="mt-4 text-xs text-[var(--text-secondary)]">{formatPublishedDate(post.createdAt)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      <div className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-lg transition-all duration-300 hover:border-[var(--primary)] hover:shadow-xl">
        <div className="h-56">
          <img alt={post.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" src={image} />
        </div>
        <div className="flex flex-grow flex-col p-4 md:p-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">{category}</span>
          <Link className="mt-1 block text-lg font-bold leading-tight text-[var(--text-primary)] transition-colors hover:text-[var(--primary)]" href={getPostHref(post)}>
            {post.title}
          </Link>
          <p className="mt-2 flex-grow text-sm text-[var(--text-secondary)]">{description}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] transition-all duration-200 group-hover:gap-2">Continue reading</span>
          <p className="mt-4 self-start text-xs text-[var(--text-secondary)]">{formatPublishedDate(post.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}
