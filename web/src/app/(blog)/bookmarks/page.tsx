"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { z } from "zod";

import { SiteHeader } from "@/components/layout/site-header";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPostHref } from "@/lib/utils";

type BookmarkedPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  imageUrl: string | null;
  bookmarkedAt: string;
};

const bookmarkedPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  imageUrl: z.string().nullable(),
  bookmarkedAt: z.string(),
});

const bookmarksResponseSchema = z.object({
  posts: z.array(bookmarkedPostSchema),
});

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(iso));
}

export default function BookmarksPage() {
  const [status, setStatus] = useState<"loading" | "unauthenticated" | "ready">("loading");
  const [posts, setPosts] = useState<BookmarkedPost[]>([]);

  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      flushSync(() => {
        setStatus("unauthenticated");
      });
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (!cancelled) setStatus("unauthenticated");
        return;
      }

      const res = await fetch("/api/bookmarks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!cancelled) {
        if (res.ok) {
          const json = bookmarksResponseSchema.parse(await res.json());
          setPosts(json.posts);
        }
        setStatus("ready");
      }
    })();

    return () => { cancelled = true; };
  }, [supabase]);

  return (
    <main id="main-content" className="min-h-screen pb-20 pt-20 sm:pt-24" style={{ background: "var(--background)" }} tabIndex={-1}>
      <SiteHeader />

      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mt-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Your library</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">Saved posts</h1>
        </div>

        {status === "loading" ? (
          <div className="mt-10 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          </div>
        ) : status === "unauthenticated" ? (
          <div className="mt-10 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-10 text-center shadow-lg">
            <p className="text-lg font-bold text-[var(--text-primary)]">Sign in to see your saved posts</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Bookmark any post and it will show up here.</p>
            <Link
              className="btn-primary mt-6 inline-block rounded-full px-6 py-2.5 text-sm font-bold shadow-md transition-transform hover:-translate-y-0.5"
              href="/login?redirectTo=/bookmarks"
            >
              Sign in
            </Link>
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-10 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-10 text-center shadow-lg">
            <p className="text-lg font-bold text-[var(--text-primary)]">No saved posts yet</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Hit the bookmark button on any post to save it here.</p>
            <Link
              className="btn-primary mt-6 inline-block rounded-full px-6 py-2.5 text-sm font-bold shadow-md transition-transform hover:-translate-y-0.5"
              href="/"
            >
              Browse stories →
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {posts.map((post) => (
              <article key={post.id} className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <Link aria-label={`Read: ${post.title}`} className="absolute inset-0 z-[1]" href={getPostHref(post)} />
                {post.imageUrl ? (
                  <div className="relative aspect-[5/3] w-full overflow-hidden">
                    <Image
                      alt={post.title}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      src={post.imageUrl}
                    />
                  </div>
                ) : (
                  <div className="aspect-[5/3] w-full bg-gradient-to-br from-[var(--accent-soft)] to-[var(--background)]" />
                )}
                <div className="p-5">
                  <h2 className="text-balance text-base font-bold leading-snug text-[var(--text-primary)] sm:text-lg">{post.title}</h2>
                  {post.excerpt ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">{post.excerpt}</p>
                  ) : null}
                  <p className="mt-3 text-xs text-[var(--text-secondary)]">Saved {formatDate(post.bookmarkedAt)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
