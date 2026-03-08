import { FC, SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Article, Post } from "../../../shared/src/types";
import { useDebounce } from "../hooks/useDebounce";
import { useAuth } from "../context/AuthContext";
import SEO from "./SEO";
import { SkeletonGrid } from "./SkeletonCard";
import { CategoryIcon } from "../utils/categoryIcons";
import { formatDate } from "../utils/dateTime";
import { apiPath } from "../utils/api";

const POSTS_PER_PAGE = 20;

type HomeProps = {
  searchTerm: string;
};

const LoadingSpinner: FC = () => (
  <div className="flex justify-center items-center col-span-full py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--spinner)]"></div>
  </div>
);

const NoResults: FC = () => (
  <div className="col-span-full rounded-[2rem] border border-[var(--border)] bg-[var(--card-bg)] p-12 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
    <p className="text-xs uppercase tracking-[0.35em] text-[var(--primary)] mb-3">No Results</p>
    <h3 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">No adventures matched that search</h3>
    <p className="mx-auto max-w-xl text-sm text-[var(--text-secondary)]">
      Try a different keyword, or clear the search to jump back into the full journal.
    </p>
  </div>
);

const stripHtml = (html: string): string => {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const isNewPost = (dateString: string): boolean => {
  if (!dateString) return false;
  const postDate = new Date(dateString);
  const now = new Date();
  const hoursDiff = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
  return hoursDiff < 24;
};

const assignLayoutAndGridClass = (posts: Post[]): Article[] => {
  return posts.map((post) => {
    let gridClass = "col-span-1";

    if (post.type === "split-horizontal") {
      gridClass = "col-span-1 lg:col-span-2";
    }

    return {
      id: post.id,
      image: post.image_url || "https://placehold.co/900x700/EEE/31343C?text=Image+Not+Found",
      category: post.category || "General",
      title: post.title,
      description: stripHtml(post.description || ""),
      date: post.created_at,
      gridClass,
      dynamicViewType: post.type,
      status: post.status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API includes tags at runtime
      tags: (post as any).tags || [],
    };
  });
};

type ArticleCardProps = {
  article: Article;
  dateFormatPreference?: "relative" | "absolute";
};

const StatusBadge: FC<{ status: Article["status"]; date: string }> = ({ status, date }) => {
  if (status === "draft") {
    return <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-amber-950">DRAFT</span>;
  }

  if (status === "scheduled") {
    return <span className="rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-white">SCHEDULED</span>;
  }

  if (isNewPost(date)) {
    return <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-white">NEW</span>;
  }

  return null;
};

const ArticleCard: FC<ArticleCardProps> = ({ article, dateFormatPreference = "relative" }) => {
  const { id, image, category, title, date, description, gridClass, tags, dynamicViewType, status } = article;
  const formattedDate = formatDate(date, dateFormatPreference);

  const handleImageError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    event.currentTarget.src = "https://placehold.co/900x700/EEE/31343C?text=Image+Not+Found";
  };

  const bodyClass = dynamicViewType === "split-horizontal"
    ? "lg:grid lg:grid-cols-2"
    : "flex flex-col";

  const imageHeightClass = dynamicViewType === "split-horizontal"
    ? "h-72 lg:h-full lg:min-h-[22rem]"
    : dynamicViewType === "hover"
      ? "h-[26rem]"
      : "h-72";

  const contentClass = dynamicViewType === "split-horizontal"
    ? "flex h-full flex-col gap-4 p-6 sm:p-7 lg:min-h-[22rem] lg:bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.98))]"
    : "flex h-full flex-col gap-4 p-6 sm:p-7";

  const cardToneClass = dynamicViewType === "hover"
    ? "overflow-hidden bg-[linear-gradient(160deg,rgba(7,12,20,0.18),rgba(7,12,20,0.02))]"
    : "overflow-hidden bg-[var(--card-bg)]";

  return (
    <article className={gridClass}>
      <Link
        to={`/posts/${id}`}
        className={`group block h-full rounded-[2rem] border border-[var(--border)] shadow-[0_24px_80px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/60 hover:shadow-[0_28px_90px_rgba(15,23,42,0.14)] ${cardToneClass}`}
      >
        <div className={bodyClass}>
          <div className={`relative overflow-hidden ${imageHeightClass}`}>
            <img
              src={image}
              alt={title}
              onError={handleImageError}
              loading="lazy"
              className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.55))]" />
            <div className="absolute left-5 top-5 right-5 flex items-start justify-between gap-4">
              <Link
                to={`/category/${encodeURIComponent(category)}`}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-md hover:bg-black/45"
              >
                <CategoryIcon category={category} className="h-3.5 w-3.5" />
                {category}
              </Link>
              <StatusBadge status={status} date={date} />
            </div>
          </div>

          <div className={contentClass}>
            <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              <span>{formattedDate}</span>
              <span className="text-[var(--primary)]">Adventure</span>
            </div>

            <div className="space-y-4 lg:flex-1 lg:justify-center lg:flex lg:flex-col">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold leading-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
                  {title}
                </h2>
                <p className="text-sm leading-7 text-[var(--text-secondary)] line-clamp-4 lg:line-clamp-6">
                  {description || "Open the post to wander through the full adventure."}
                </p>
              </div>

              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {tags.slice(0, 4).map((tag) => (
                    <Link
                      key={tag.id}
                      to={`/tag/${tag.slug}`}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      className="rounded-full border border-[var(--border)] bg-[var(--background)]/90 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-4 text-sm">
              <span className="font-medium text-[var(--text-primary)]">Open Adventure</span>
              <span className="inline-flex items-center gap-2 text-[var(--primary)] transition-transform duration-200 group-hover:translate-x-1">
                Read
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
};

export default function Home() {
  const { user, token } = useAuth();
  const { searchTerm } = useOutletContext<HomeProps>();
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [showDraftsOnly, setShowDraftsOnly] = useState(false);

  const mainContentRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const prevSearchRef = useRef(debouncedSearchTerm);
  const prevDraftsRef = useRef(showDraftsOnly);

  const isAdmin = user?.role === "admin";

  const fetchPosts = useCallback(async (
    currentOffset: number,
    search: string,
    isInitial: boolean = false,
    authToken?: string | null,
    draftsOnly: boolean = false,
  ) => {
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        limit: POSTS_PER_PAGE.toString(),
        offset: currentOffset.toString(),
      });

      if (search) params.append("search", search);
      if (draftsOnly) params.append("status", "draft");

      const headers: HeadersInit = {};
      const requestInit: RequestInit = { headers };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
        requestInit.cache = "no-store";
      }

      const response = await fetch(apiPath(`/api/posts?${params}`), requestInit);
      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const data = await response.json();

      if (isInitial) {
        setAllPosts(data.posts || []);
      } else {
        setAllPosts((prev) => [...prev, ...(data.posts || [])]);
      }

      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const searchChanged = prevSearchRef.current !== debouncedSearchTerm;
    const filterChanged = prevDraftsRef.current !== showDraftsOnly;

    prevSearchRef.current = debouncedSearchTerm;
    prevDraftsRef.current = showDraftsOnly;

    setOffset(0);
    if (searchChanged || filterChanged) {
      setAllPosts([]);
    }

    fetchPosts(0, debouncedSearchTerm, true, token, showDraftsOnly);
  }, [debouncedSearchTerm, fetchPosts, token, showDraftsOnly]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          const newOffset = offset + POSTS_PER_PAGE;
          setOffset(newOffset);
          fetchPosts(newOffset, debouncedSearchTerm, false, token, showDraftsOnly);
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [debouncedSearchTerm, fetchPosts, hasMore, isLoading, isLoadingMore, offset, showDraftsOnly, token]);

  useEffect(() => {
    const handleScroll = () => {
      if (!mainContentRef.current) return;
      const { top } = mainContentRef.current.getBoundingClientRect();
      if (top <= window.innerHeight * 0.6) {
        setShowContent(true);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const displayedArticles = useMemo<Article[]>(() => {
    const seenIds = new Set<number>();
    const uniquePosts = allPosts.filter((post) => {
      if (seenIds.has(post.id)) return false;
      seenIds.add(post.id);
      return true;
    });

    return assignLayoutAndGridClass(uniquePosts);
  }, [allPosts]);

  return (
    <>
      <SEO
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "J²Adventures",
          url: "https://jsquaredadventures.com",
          logo: "https://jsquaredadventures.com/og-image.jpg",
          description: "Join us on our adventures around the world! From hiking and camping to food tours and city explorations, we share our travel stories and experiences.",
          sameAs: [],
        }}
      />

      <section
        className="landing-page"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1682686578842-00ba49b0a71a?q=60&w=1075&fm=webp&fit=crop&ixlib=rb-4.1.0')",
        }}
      >
        <div className="landing-page__veil" />
        <div className="landing-page__content">
          <h1 className="landing-title">J²Adventures</h1>
        </div>
        <div className="scroll-indicator">
          <span className="scroll-indicator__label">Scroll</span>
          <div className="arrow-down"></div>
        </div>
      </section>

      <div
        id="dispatches"
        ref={mainContentRef}
        className={`main-content ${showContent ? "main-content-visible" : "main-content-hidden"}`}
      >
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--primary)]">Latest Dispatches</p>
              <h2 className="text-4xl md:text-5xl font-semibold leading-tight text-[var(--text-primary)] max-w-4xl">
                A simple collection of adventures, sweet little detours, and places worth remembering.
              </h2>
              <p className="max-w-2xl text-base md:text-lg leading-8 text-[var(--text-secondary)]">
                Browse the latest adventures, search for a mood or category, and hop into whatever feels fun next.
              </p>
            </div>

            <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--primary)]">Status</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {isAdmin ? "Switch between published stories and admin drafts without leaving the homepage." : "Browse the public adventures and use search to jump into anything that fits the vibe."}
                  </p>
                </div>
                <div className="rounded-full bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
                  {displayedArticles.length} loaded
                </div>
              </div>

              {isAdmin && user && (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowDraftsOnly(false)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      !showDraftsOnly
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
                    }`}
                  >
                    All Posts
                  </button>
                  <button
                    onClick={() => setShowDraftsOnly(true)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      showDraftsOnly
                        ? "bg-amber-300 text-amber-950"
                        : "bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
                    }`}
                  >
                    Drafts Only
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <main className="container mx-auto px-4 pb-16 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3 auto-rows-[minmax(300px,auto)]">
              <SkeletonGrid count={6} />
            </div>
          ) : displayedArticles.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3 auto-rows-[minmax(300px,auto)] grid-flow-dense">
              {displayedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  dateFormatPreference={user?.date_format_preference || "relative"}
                />
              ))}

              <div ref={observerTarget} className="col-span-full h-10" />
              {isLoadingMore && <LoadingSpinner />}

              {!hasMore && !isLoadingMore && displayedArticles.length > 0 && (
                <div className="col-span-full pt-4">
                  <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card-bg)] px-8 py-5 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                    <p className="text-xs uppercase tracking-[0.35em] text-[var(--primary)] mb-2">That’s Everything</p>
                    <p className="text-[var(--text-primary)] font-medium">You’ve reached the end of the current adventures.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              <NoResults />
            </div>
          )}
        </main>
      </div>
    </>
  );
}
