"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import type { BlogPost } from "@/types/blog";
import { HomePostCard } from "@/components/blog/home-post-card";
import { groupPostsBySeason } from "@/lib/utils";
import { FeedbackPanel } from "@/components/ui/feedback-panel";

const POSTS_PER_PAGE = 20;
const PULL_THRESHOLD = 64;

function SeasonIcon({ label }: { label: string }) {
  if (label.startsWith("Winter")) {
    return (
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 h-3.5 w-3.5">
        <path d="m10 20-2.5-2.5L10 15"/><path d="M14 20l2.5-2.5L14 15"/><path d="m20 10-2.5-2.5L15 10"/><path d="m20 14-2.5 2.5L15 14"/><path d="m4 10 2.5-2.5L9 10"/><path d="m4 14 2.5 2.5L9 14"/><path d="m10 4-2.5 2.5L10 9"/><path d="m14 4 2.5 2.5L14 9"/><path d="M12 2v20"/><path d="M22 12H2"/><path d="m19 5-3.5 3.5"/><path d="m5 19 3.5-3.5"/><path d="m5 5 3.5 3.5"/><path d="m19 19-3.5-3.5"/>
      </svg>
    );
  }

  if (label.startsWith("Spring")) {
    return (
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 h-3.5 w-3.5">
        <path d="M12 22c4.2 0 7-3.22 7-8.25V10c0-3.24-2.1-5.5-5.5-5.5-1.92 0-3.5 1.05-3.5 1.05S8.42 4.5 6.5 4.5C3.1 4.5 1 6.76 1 10v3.75C1 18.78 3.8 22 8 22"/>
        <path d="M12 22v-9"/>
        <path d="M12 22a8.5 8.5 0 0 0 4-13"/>
        <path d="M12 22a8.5 8.5 0 0 1-4-13"/>
      </svg>
    );
  }

  if (label.startsWith("Summer")) {
    return (
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 h-3.5 w-3.5">
        <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 h-3.5 w-3.5">
      <path d="M14.5 22.5 12 17l-2.5 5.5"/><path d="M12 17v-4"/><path d="m16 13-4-4-4 4"/><path d="M12 9V2"/><path d="m8 6 4-4 4 4"/>
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <div aria-label="Loading more posts" className="col-span-full flex items-center justify-center py-8" role="status">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--spinner)]"></div>
    </div>
  );
}

export function HomeFeed({
  initialPosts,
  initialSearch = "",
  seasonOverrides = {},
}: {
  initialPosts: BlogPost[];
  initialSearch?: string;
  seasonOverrides?: Record<string, string>;
}) {
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
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
    pullDistanceRef.current = pullDistance;
    initialSearchRef.current = initialSearch;
  }, [isRefreshing, pullDistance, initialSearch]);

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
      <section aria-label="Stories feed" className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <FeedbackPanel
          actions={
            <>
              <Link
                className="btn-primary rounded-full px-5 py-2 text-sm font-bold shadow-sm transition-transform hover:-translate-y-0.5"
                href="/"
              >
                Browse all stories
              </Link>
              <Link
                className="rounded-full border border-[var(--primary)] bg-[var(--accent-soft)] px-5 py-2 text-sm font-semibold text-[var(--primary)] transition-colors hover:border-transparent hover:[background-color:var(--btn-bg)] hover:[color:var(--btn-text)]"
                href="/map"
              >
                Explore the map
              </Link>
            </>
          }
          description="Try a shorter term, a place name, or a tag. Search looks at titles, categories, tags, and excerpts. Use the search box above to refine the query."
          eyebrow="No matches"
          title={`No adventures match "${initialSearch}".`}
        />
      </section>
    );
  }

  const showPullIndicator = pullDistance > 0 || isRefreshing;
  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const groupedPosts = groupPostsBySeason(uniquePosts).map((group) =>
    seasonOverrides[group.key] ? { ...group, label: seasonOverrides[group.key]! } : group,
  );

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
    <section aria-label="Stories feed" className="container mx-auto p-4 sm:p-6 lg:p-8">
      {groupedPosts.map((group, groupIndex) => (
        <section key={group.key} aria-label={group.label} className="mb-12 last:mb-0">
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
              <HomePostCard
                key={post.id}
                post={post}
                priority={groupIndex === 0 && postIndex === 0}
                searchTerm={searchTerm}
              />
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
        {!hasMore && uniquePosts.length > 0 ? (
          <div className="col-span-full py-6 text-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-8 py-4 shadow-lg">
              <span className="font-semibold text-[var(--text-primary)]">You&apos;ve reached the end of the adventures!</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
    </div>
  );
}
