import Image from "next/image";
import Link from "next/link";

import type { BlogPost } from "@/types/blog";
import { formatPublishedDate, getPostHref, htmlToPlainText } from "@/lib/utils";

export function PostCard({ post }: { post: BlogPost }) {
  return (
    <article className="group overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-xl transition-transform duration-300 hover:-translate-y-1">
      {post.imageUrl ? (
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            alt={post.title}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            src={post.imageUrl}
          />
        </div>
      ) : null}

      <div className="p-6">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          <span>{post.category ?? "Adventure"}</span>
          <span className="text-[var(--muted)]">{formatPublishedDate(post.createdAt)}</span>
        </div>

        <h3 className="mt-4 text-2xl font-semibold leading-tight text-[var(--foreground)]">
          <Link href={getPostHref(post)}>{post.title}</Link>
        </h3>

        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          {htmlToPlainText(post.excerpt ?? post.description).slice(0, 180) || "Open the story to read more from this adventure."}
        </p>
      </div>
    </article>
  );
}
