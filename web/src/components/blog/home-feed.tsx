"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { BlogPost } from "@/types/blog";
import { HomePostCard } from "@/components/blog/home-post-card";

const POSTS_PER_PAGE = 20;

function LoadingSpinner() {
  return (
    <div className="col-span-full flex items-center justify-center py-8">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--spinner)]"></div>
    </div>
  );
}

export function HomeFeed({ initialPosts }: { initialPosts: BlogPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [offset, setOffset] = useState(initialPosts.length);
  const [hasMore, setHasMore] = useState(initialPosts.length >= POSTS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const targetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || isLoadingMore || !hasMore) {
          return;
        }

        setIsLoadingMore(true);
        fetch(`/api/posts?limit=${POSTS_PER_PAGE}&offset=${offset}`)
          .then((response) => response.json())
          .then((payload: { posts?: BlogPost[]; hasMore?: boolean }) => {
            const nextPosts = payload.posts ?? [];
            setPosts((currentPosts) => {
              const seen = new Set(currentPosts.map((post) => post.id));
              return [...currentPosts, ...nextPosts.filter((post) => !seen.has(post.id))];
            });
            setOffset((currentOffset) => currentOffset + nextPosts.length);
            setHasMore(Boolean(payload.hasMore));
          })
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
  }, [hasMore, isLoadingMore, offset]);

  const uniquePosts = useMemo(() => {
    const seen = new Set<string>();
    return posts.filter((post) => {
      if (seen.has(post.id)) {
        return false;
      }
      seen.add(post.id);
      return true;
    });
  }, [posts]);

  return (
    <main className="container mx-auto grid grid-cols-1 gap-8 p-4 auto-rows-[minmax(300px,auto)] grid-flow-dense sm:grid-cols-2 sm:p-6 md:grid-cols-2 lg:grid-cols-3 lg:p-8 xl:grid-cols-4">
      {uniquePosts.map((post) => (
        <HomePostCard key={post.id} post={post} />
      ))}
      <div ref={targetRef} className="col-span-full h-10" />
      {isLoadingMore ? <LoadingSpinner /> : null}
      {!hasMore && uniquePosts.length > 0 ? (
        <div className="col-span-full py-6 text-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-8 py-4 shadow-lg">
            <span className="font-semibold text-[var(--text-primary)]">You&apos;ve reached the end of the adventures!</span>
          </div>
        </div>
      ) : null}
    </main>
  );
}
