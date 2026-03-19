"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import type { BlogPost } from "@/types/blog";
import { HomePostCard } from "@/components/blog/home-post-card";
import { FeedbackPanel } from "@/components/ui/feedback-panel";
import { groupPostsBySeason } from "@/lib/utils";

const POSTS_PER_PAGE = 20;

function SeasonIcon({ label }: { label: string }) {
  if (label.startsWith("Winter")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 h-3.5 w-3.5">
        <path d="m10 20-2.5-2.5L10 15"/><path d="M14 20l2.5-2.5L14 15"/><path d="m20 10-2.5-2.5L15 10"/><path d="m20 14-2.5 2.5L15 14"/><path d="m4 10 2.5-2.5L9 10"/><path d="m4 14 2.5 2.5L9 14"/><path d="m10 4-2.5 2.5L10 9"/><path d="m14 4 2.5 2.5L14 9"/><path d="M12 2v20"/><path d="M22 12H2"/><path d="m19 5-3.5 3.5"/><path d="m5 19 3.5-3.5"/><path d="m5 5 3.5 3.5"/><path d="m19 19-3.5-3.5"/>
      </svg>
    );
  }

  if (label.startsWith("Spring")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 h-3.5 w-3.5">
        <path d="M12 22c4.2 0 7-3.22 7-8.25V10c0-3.24-2.1-5.5-5.5-5.5-1.92 0-3.5 1.05-3.5 1.05S8.42 4.5 6.5 4.5C3.1 4.5 1 6.76 1 10v3.75C1 18.78 3.8 22 8 22"/>
        <path d="M12 22v-9"/>
        <path d="M12 22a8.5 8.5 0 0 0 4-13"/>
        <path d="M12 22a8.5 8.5 0 0 1-4-13"/>
      </svg>
    );
  }

  if (label.startsWith("Summer")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 h-3.5 w-3.5">
        <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
      </svg>
    );
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 h-3.5 w-3.5">
      <path d="M14.5 22.5 12 17l-2.5 5.5"/><path d="M12 17v-4"/><path d="m16 13-4-4-4 4"/><path d="M12 9V2"/><path d="m8 6 4-4 4 4"/>
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <div className="col-span-full flex items-center justify-center py-8">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--spinner)]"></div>
    </div>
  );
}

type FilteredFeedProps = {
  initialPosts: BlogPost[];
  apiParams: Record<string, string>;
  emptyTitle: string;
  emptyDescription: string;
};

export function FilteredFeed({ initialPosts, apiParams, emptyTitle, emptyDescription }: FilteredFeedProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [offset, setOffset] = useState(initialPosts.length);
  const [hasMore, setHasMore] = useState(initialPosts.length >= POSTS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const targetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || isLoadingMore || !hasMore) {
          return;
        }

        setIsLoadingMore(true);
        const params = new URLSearchParams({
          ...apiParams,
          limit: String(POSTS_PER_PAGE),
          offset: String(offset),
        });

        fetch(`/api/posts?${params.toString()}`)
          .then((response) => response.json())
          .then((payload: { posts?: BlogPost[]; hasMore?: boolean }) => {
            const nextPosts = payload.posts ?? [];
            setHasError(false);
            setPosts((currentPosts) => {
              const seen = new Set(currentPosts.map((post) => post.id));
              return [...currentPosts, ...nextPosts.filter((post) => !seen.has(post.id))];
            });
            setOffset((currentOffset) => currentOffset + nextPosts.length);
            setHasMore(Boolean(payload.hasMore));
          })
          .catch(() => setHasError(true))
          .finally(() => setIsLoadingMore(false));
      },
      { threshold: 0.1 },
    );

    const target = targetRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [apiParams, hasMore, isLoadingMore, offset]);

  if (posts.length === 0 && !isLoadingMore) {
    return (
      <section aria-label="Filtered stories feed" className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <FeedbackPanel
          actions={
            <Link
              className="btn-primary rounded-full px-5 py-2 text-sm font-bold shadow-sm transition-transform hover:-translate-y-0.5"
              href="/"
            >
              Browse all stories
            </Link>
          }
          description={emptyDescription}
          eyebrow="Nothing here yet"
          title={emptyTitle}
        />
      </section>
    );
  }

  const groupedPosts = groupPostsBySeason(posts);

  return (
    <section aria-label="Filtered stories feed" className="container mx-auto p-4 sm:p-6 lg:p-8">
      {groupedPosts.map((group, groupIndex) => (
        <section key={group.key} className="mb-12 last:mb-0">
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
              <SeasonIcon label={group.label} />
              {group.label.split(" ")[0]}
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{group.label}</h2>
            <span aria-hidden="true" className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <div className="grid grid-cols-1 gap-8 auto-rows-[minmax(300px,auto)] grid-flow-dense sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.posts.map((post, postIndex) => (
              <HomePostCard key={post.id} post={post} priority={groupIndex === 0 && postIndex === 0} />
            ))}
          </div>
        </section>
      ))}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {hasError ? (
          <div className="col-span-full mt-8">
            <FeedbackPanel
              description="The trail stalled for a moment. Scroll again in a bit to retry loading more stories."
              eyebrow="Load interrupted"
              title="More stories could not be loaded right now."
              tone="error"
            />
          </div>
        ) : null}
        <div ref={targetRef} className="col-span-full h-10" />
        {isLoadingMore ? <LoadingSpinner /> : null}
        {!hasMore && posts.length > 0 ? (
          <div className="col-span-full py-6 text-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-8 py-4 shadow-lg">
              <span className="font-semibold text-[var(--text-primary)]">You&apos;ve reached the end of the adventures!</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
