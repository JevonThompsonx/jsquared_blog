"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import type { BlogPost } from "@/types/blog";
import { HomePostCard } from "@/components/blog/home-post-card";
import { FeedbackPanel } from "@/components/ui/feedback-panel";

const POSTS_PER_PAGE = 20;

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
      <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
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
      </main>
    );
  }

  return (
    <main className="container mx-auto grid grid-cols-1 gap-8 p-4 auto-rows-[minmax(300px,auto)] grid-flow-dense sm:grid-cols-2 sm:p-6 md:grid-cols-2 lg:grid-cols-3 lg:p-8 xl:grid-cols-4">
      {posts.map((post) => (
        <HomePostCard key={post.id} post={post} />
      ))}
      {hasError ? (
        <div className="col-span-full">
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
    </main>
  );
}
