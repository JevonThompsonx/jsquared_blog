"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { BlogPost } from "@/types/blog";
import { HomePostCard } from "@/components/blog/home-post-card";
import { FeedbackPanel } from "@/components/ui/feedback-panel";

const POSTS_PER_PAGE = 20;
const PULL_THRESHOLD = 64;

function LoadingSpinner() {
  return (
    <div className="col-span-full flex items-center justify-center py-8">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--spinner)]"></div>
    </div>
  );
}

export function HomeFeed({ initialPosts, initialSearch = "" }: { initialPosts: BlogPost[]; initialSearch?: string }) {
  const [posts, setPosts] = useState(initialPosts);
  const [offset, setOffset] = useState(initialPosts.length);
  const [hasMore, setHasMore] = useState(initialPosts.length >= POSTS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const pullStartYRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const initialSearchRef = useRef(initialSearch);
  const searchTerm = initialSearch.trim().toLowerCase();

  // Keep refs in sync with state
  isRefreshingRef.current = isRefreshing;
  pullDistanceRef.current = pullDistance;
  initialSearchRef.current = initialSearch;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || isLoadingMore || !hasMore) {
          return;
        }

        setIsLoadingMore(true);
        fetch(`/api/posts?limit=${POSTS_PER_PAGE}&offset=${offset}&search=${encodeURIComponent(initialSearch)}`)
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
  }, [hasMore, initialSearch, isLoadingMore, offset]);

  // Pull-to-refresh (mobile)
  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY === 0 && !document.body.classList.contains("lightbox-open")) {
        pullStartYRef.current = e.touches[0]?.clientY ?? null;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (pullStartYRef.current === null || window.scrollY > 0 || document.body.classList.contains("lightbox-open")) return;
      const delta = (e.touches[0]?.clientY ?? 0) - pullStartYRef.current;
      if (delta > 0) {
        setPullDistance(Math.min(delta, PULL_THRESHOLD * 1.5));
      } else {
        setPullDistance(0);
      }
    }

    function onTouchEnd() {
      const dist = pullDistanceRef.current;
      setPullDistance(0);
      pullStartYRef.current = null;

      if (dist < PULL_THRESHOLD || isRefreshingRef.current) return;

      setIsRefreshing(true);
      isRefreshingRef.current = true;

      void fetch(`/api/posts?limit=${POSTS_PER_PAGE}&offset=0&search=${encodeURIComponent(initialSearchRef.current)}`)
        .then((res) => res.json())
        .then((payload: { posts?: BlogPost[]; hasMore?: boolean }) => {
          const fresh = payload.posts ?? [];
          setPosts(fresh);
          setOffset(fresh.length);
          setHasMore(Boolean(payload.hasMore));
          setHasError(false);
        })
        .catch(() => setHasError(true))
        .finally(() => {
          setIsRefreshing(false);
          isRefreshingRef.current = false;
        });
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

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

  if (searchTerm && uniquePosts.length === 0 && !isLoadingMore) {
    return (
      <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <FeedbackPanel
          description="Try a category, a place name, or a tag from one of your posts. Search works best when it feels like browsing a travel journal rather than filtering a database."
          eyebrow="No matches"
          title={`No adventures match "${initialSearch}".`}
        />
      </main>
    );
  }

  const showPullIndicator = pullDistance > 0 || isRefreshing;
  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div>
      {showPullIndicator ? (
        <div
          className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
          style={{ height: isRefreshing ? "52px" : `${Math.min(pullDistance * 0.6, 52)}px` }}
        >
          <div
            className={`h-8 w-8 rounded-full border-2 border-[var(--primary)] border-b-transparent ${isRefreshing ? "animate-spin" : ""}`}
            style={{ opacity: isRefreshing ? 1 : pullProgress, transform: `rotate(${pullDistance * 2}deg)` }}
          />
        </div>
      ) : null}
    <main className="container mx-auto grid grid-cols-1 gap-8 p-4 auto-rows-[minmax(300px,auto)] grid-flow-dense sm:grid-cols-2 sm:p-6 md:grid-cols-2 lg:grid-cols-3 lg:p-8 xl:grid-cols-4">
      {uniquePosts.map((post) => (
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
      {!hasMore && uniquePosts.length > 0 ? (
        <div className="col-span-full py-6 text-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-8 py-4 shadow-lg">
            <span className="font-semibold text-[var(--text-primary)]">You&apos;ve reached the end of the adventures!</span>
          </div>
        </div>
      ) : null}
    </main>
    </div>
  );
}
