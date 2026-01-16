

import { useEffect, useMemo, FC, SyntheticEvent, useState, useRef, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Post, Article } from "../../../shared/src/types";
import { useDebounce } from "../hooks/useDebounce";
import SEO from "./SEO";
import { SkeletonGrid } from "./SkeletonCard";
import { CategoryIcon } from "../utils/categoryIcons";
import { formatDate } from "../utils/dateTime";

// Small spinner for "loading more" at bottom
const LoadingSpinner: FC = () => (
  <div className="flex justify-center items-center col-span-full py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--spinner)]"></div>
  </div>
);
const NoResults: FC = () => (
  <div className="col-span-full bg-[var(--card-bg)] shadow-xl border border-[var(--border)] rounded-2xl p-12 text-center">
    <svg className="w-16 h-16 mx-auto mb-4 text-[var(--text-secondary)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
      No Adventures Found
    </h3>
    <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
      Try adjusting your search term or check back later for new adventures.
    </p>
  </div>
);

// Strip HTML tags - done once during data transformation, not on every render
const stripHtml = (html: string): string => {
  if (!html) return "";
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const assignLayoutAndGridClass = (posts: Post[]): Article[] => {
  return posts.map((post) => {
    // Use backend-assigned type and create grid classes based on it
    let gridClass = "col-span-1"; // Default for mobile

    // Desktop layout based on post type
    if (post.type === "split-horizontal") {
      // Horizontal cards take 2 columns
      gridClass = "col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2";
    } else if (post.type === "split-vertical") {
      // Vertical cards take 1 column
      gridClass = "col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1";
    } else if (post.type === "hover") {
      // Hover cards take 1 column
      gridClass = "col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1";
    }

    return {
      id: post.id,
      image:
        post.image_url ||
        "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found",
      category: post.category || "General",
      title: post.title,
      description: stripHtml(post.description || ""), // Strip HTML once here
      date: post.created_at,
      gridClass: gridClass,
      dynamicViewType: post.type,
      status: post.status,
      tags: (post as any).tags || [], // Include tags from post
    };
  });
};

// Check if post is less than 24 hours old
const isNewPost = (dateString: string): boolean => {
  if (!dateString) return false;
  const postDate = new Date(dateString);
  const now = new Date();
  const hoursDiff = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
  return hoursDiff < 24;
};

interface ArticleCardProps {
  article: Article;
  isAnimating?: boolean;
  dateFormatPreference?: "relative" | "absolute";
}
const ArticleCard: FC<ArticleCardProps> = ({ article, isAnimating, dateFormatPreference = "relative" }) => {
  const { id, image, category, title, date, description, gridClass, tags } = article;
  const formattedDate = formatDate(date, dateFormatPreference);
  const isNew = article.status === "published" && isNewPost(date);
  const handleImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src =
      "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found";
  };

  // STYLE 1: HOVER - Image with overlay that reveals description on hover
  if (article.dynamicViewType === "hover") {
    return (
      <div className={`${gridClass} ${isAnimating ? "transition-all duration-1000 ease-out transform scale-0 opacity-0" : "transition-all duration-1000 ease-out transform scale-100 opacity-100"}`}>
        <Link to={`/posts/${id}`} className="group relative h-full rounded-lg overflow-hidden shadow-lg block">
          <img
            className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
            src={image}
            alt={title}
            onError={handleImageError}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
          <div className="absolute top-2 right-2 flex gap-2">
            {isNew && (
              <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                NEW
              </div>
            )}
            {article.status === "draft" && (
              <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                DRAFT
              </div>
            )}
            {article.status === "scheduled" && (
              <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                SCHEDULED
              </div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 p-4 md:p-6 right-0">
            <span
              onClick={(e) => {
                e.preventDefault();
                window.location.href = `/category/${encodeURIComponent(category)}`;
              }}
              className="inline-flex items-center gap-1.5 tracking-wide text-xs text-[var(--primary-light)] font-semibold uppercase hover:underline cursor-pointer"
            >
              <CategoryIcon category={category} className="w-3.5 h-3.5" />
              {category}
            </span>
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.slice(0, 3).map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/tag/${tag.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-block px-2 py-0.5 text-xs rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
                  >
                    {tag.name}
                  </Link>
                ))}
                {tags.length > 3 && (
                  <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-white/20 text-white backdrop-blur-sm">
                    +{tags.length - 3}
                  </span>
                )}
              </div>
            )}
            <h3 className="mt-1 text-lg md:text-xl font-bold leading-tight text-white">
              {title}
            </h3>
            <div className="text-gray-300 text-xs mt-2">
              {formattedDate}
            </div>
            <p className="mt-2 text-gray-200 text-sm opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-20 transition-all duration-300 ease-in-out overflow-hidden">
              {description}
            </p>
            <span className="mt-2 text-[var(--primary-light)] text-sm font-medium inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Continue reading
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </div>
        </Link>
      </div>
    );
  }

  // STYLE 2: SPLIT-HORIZONTAL - Side by side layout with image and content
  if (article.dynamicViewType === "split-horizontal") {
    return (
      <Link
        to={`/posts/${id}`}
        className={`${gridClass} ${isAnimating ? "transition-all duration-1000 ease-out transform scale-0 opacity-0" : "transition-all duration-1000 ease-out transform scale-100 opacity-100"} block`}
      >
        <div className="group h-full rounded-lg overflow-hidden shadow-lg bg-[var(--card-bg)] border border-[var(--border)] transition-all duration-300 hover:border-[var(--primary)] hover:shadow-xl flex flex-col md:flex-row relative">
          <div className="absolute top-2 right-2 flex gap-2 z-10">
            {isNew && (
              <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                NEW
              </div>
            )}
            {article.status === "draft" && (
              <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                DRAFT
              </div>
            )}
            {article.status === "scheduled" && (
              <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                SCHEDULED
              </div>
            )}
          </div>
          <div className="md:w-1/2 h-64 md:h-auto">
            <img
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              src={image}
              alt={title}
              onError={handleImageError}
              loading="lazy"
            />
          </div>
          <div className="md:w-1/2 p-4 md:p-6 flex flex-col justify-between">
            <div>
              <span
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = `/category/${encodeURIComponent(category)}`;
                }}
                className="inline-flex items-center gap-1.5 tracking-wide text-xs text-[var(--primary)] font-semibold uppercase hover:underline cursor-pointer"
              >
                <CategoryIcon category={category} className="w-3.5 h-3.5" />
                {category}
              </span>
              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.slice(0, 3).map((tag) => (
                    <Link
                      key={tag.id}
                      to={`/tag/${tag.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-block px-2 py-0.5 text-xs rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 transition-colors"
                    >
                      {tag.name}
                    </Link>
                  ))}
                  {tags.length > 3 && (
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                      +{tags.length - 3}
                    </span>
                  )}
                </div>
              )}
              <h3 className="mt-1 text-lg md:text-xl font-bold leading-tight text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors">
                {title}
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
              <span className="mt-3 text-[var(--primary)] text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
                Continue reading
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>
            <div className="mt-4 text-xs text-[var(--text-secondary)]">
              {formattedDate}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // STYLE 3: SPLIT-VERTICAL - Image on top, content below
  return (
    <Link
      to={`/posts/${id}`}
      className={`${gridClass} ${isAnimating ? "transition-all duration-1000 ease-out transform scale-0 opacity-0" : "transition-all duration-1000 ease-out transform scale-100 opacity-100"} block`}
    >
      <div className="group h-full rounded-lg overflow-hidden shadow-lg bg-[var(--card-bg)] border border-[var(--border)] transition-all duration-300 hover:border-[var(--primary)] hover:shadow-xl flex flex-col relative">
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          {isNew && (
            <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
              NEW
            </div>
          )}
          {article.status === "draft" && (
            <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
              DRAFT
            </div>
          )}
          {article.status === "scheduled" && (
            <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
              SCHEDULED
            </div>
          )}
        </div>
        <div className="h-56">
          <img
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            src={image}
            alt={title}
            onError={handleImageError}
            loading="lazy"
          />
        </div>
        <div className="p-4 md:p-6 flex-grow flex flex-col">
          <span
            onClick={(e) => {
              e.preventDefault();
              window.location.href = `/category/${encodeURIComponent(category)}`;
            }}
            className="inline-flex items-center gap-1.5 tracking-wide text-xs text-[var(--primary)] font-semibold uppercase hover:underline cursor-pointer"
          >
            <CategoryIcon category={category} className="w-3.5 h-3.5" />
            {category}
          </span>
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.slice(0, 3).map((tag) => (
                <Link
                  key={tag.id}
                  to={`/tag/${tag.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-block px-2 py-0.5 text-xs rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
              {tags.length > 3 && (
                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}
          <h3 className="mt-1 font-bold text-lg leading-tight text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors">
            {title}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)] flex-grow">
            {description}
          </p>
          <span className="mt-3 text-[var(--primary)] text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
            Continue reading
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
          <p className="mt-4 text-xs text-[var(--text-secondary)] self-start">
            {formattedDate}
          </p>
        </div>
      </div>
    </Link>
  );
};

interface HomeProps {
  searchTerm: string;
}

export default function Home() {
  const { user, token } = useAuth();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAnimating] = useState(false); // Start false for faster perceived load
  const [showContent, setShowContent] = useState(true); // Start visible to prevent scroll issues
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [showDraftsOnly, setShowDraftsOnly] = useState(false); // Draft filter toggle
  const mainContentRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const { searchTerm } = useOutletContext<HomeProps>();
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const POSTS_PER_PAGE = 20;

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  const fetchPosts = useCallback(async (
    currentOffset: number,
    search: string,
    isInitial: boolean = false,
    authToken?: string | null,
    draftsOnly: boolean = false
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

      if (search) {
        params.append("search", search);
      }

      // Add status filter for drafts only view
      if (draftsOnly) {
        params.append("status", "draft");
      }

      // Include auth token if user is logged in (for admin draft visibility)
      const headers: HeadersInit = {};
      const fetchOptions: RequestInit = { headers };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
        // Bypass browser cache for authenticated requests to get fresh data
        fetchOptions.cache = "no-store";
      }

      const response = await fetch(`/api/posts?${params}`, fetchOptions);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      if (isInitial) {
        setAllPosts(data.posts || []);
      } else {
        setAllPosts(prev => [...prev, ...(data.posts || [])]);
      }

      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Track previous values to detect actual filter changes (not just token updates)
  const prevSearchRef = useRef(debouncedSearchTerm);
  const prevDraftsRef = useRef(showDraftsOnly);

  // Initial load and search changes (also re-fetch when token/filter changes)
  useEffect(() => {
    const searchChanged = prevSearchRef.current !== debouncedSearchTerm;
    const filterChanged = prevDraftsRef.current !== showDraftsOnly;

    // Update refs
    prevSearchRef.current = debouncedSearchTerm;
    prevDraftsRef.current = showDraftsOnly;

    setOffset(0);
    // Only clear posts when search or filter actually changes, not when token changes
    // This prevents the flash where posts disappear and reappear on initial auth
    if (searchChanged || filterChanged) {
      setAllPosts([]);
    }
    fetchPosts(0, debouncedSearchTerm, true, token, showDraftsOnly);
  }, [debouncedSearchTerm, fetchPosts, token, showDraftsOnly]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          const newOffset = offset + POSTS_PER_PAGE;
          setOffset(newOffset);
          fetchPosts(newOffset, debouncedSearchTerm, false, token, showDraftsOnly);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, isLoadingMore, offset, debouncedSearchTerm, fetchPosts, token, showDraftsOnly]);

  // Show content on scroll or immediately if already scrolled past landing
  useEffect(() => {
    const handleScroll = () => {
      if (mainContentRef.current) {
        const { top } = mainContentRef.current.getBoundingClientRect();
        if (top <= window.innerHeight * 0.5) {
          setShowContent(true);
        }
      }
    };

    // Check immediately on mount - if user refreshed while scrolled down
    handleScroll();

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Also show content immediately once posts are loaded (for faster perceived load)
  useEffect(() => {
    if (!isLoading && allPosts.length > 0 && !showContent) {
      // Small delay to allow browser to render, then trigger visibility check
      requestAnimationFrame(() => {
        if (mainContentRef.current) {
          const { top } = mainContentRef.current.getBoundingClientRect();
          // Show if content is at all visible in viewport
          if (top < window.innerHeight) {
            setShowContent(true);
          }
        }
      });
    }
  }, [isLoading, allPosts.length, showContent]);

  const displayedArticles = useMemo<Article[]>(() => {
    return assignLayoutAndGridClass(allPosts);
  }, [allPosts]);

  return (
    <>
      <SEO
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "J²Adventures",
          "url": "https://jsquaredadventures.com",
          "logo": "https://jsquaredadventures.com/og-image.jpg",
          "description": "Join us on our adventures around the world! From hiking and camping to food tours and city explorations, we share our travel stories and experiences.",
          "sameAs": []
        }}
      />
      <div
        className="landing-page"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1682686578842-00ba49b0a71a?q=60&w=1075&fm=webp&fit=crop&ixlib=rb-4.1.0')`,
        }}
      >
        <div className="welcome-text backdrop-blur-sm">
          <h1 className="landing-title drop-shadow-lg">J²Adventures</h1>
          <p className="landing-subtitle drop-shadow-md">
            Exploring the world, one adventure at a time.
          </p>
          <a
            href="/feed.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/80 hover:text-white hover:bg-white/20 transition-all duration-300 text-sm"
            title="Subscribe to RSS Feed"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/>
            </svg>
            RSS Feed
          </a>
        </div>
        <div className="scroll-indicator">
          <div className="arrow-down"></div>
        </div>
      </div>

      <div
        ref={mainContentRef}
        className={`main-content ${
          showContent ? "main-content-visible" : "main-content-hidden"
        }`}
      >
        {user && (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-lg">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--primary)]">Welcome back,</span> {user.email}!
                </p>
                {isAdmin && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">View:</span>
                    <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden">
                      <button
                        onClick={() => setShowDraftsOnly(false)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          !showDraftsOnly
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                        }`}
                      >
                        All Posts
                      </button>
                      <button
                        onClick={() => setShowDraftsOnly(true)}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                          showDraftsOnly
                            ? 'bg-yellow-500 text-black'
                            : 'bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Drafts Only
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <main className="container mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 auto-rows-[minmax(300px,auto)] grid-flow-dense">
          {isLoading ? (
            <SkeletonGrid count={6} />
          ) : displayedArticles.length > 0 ? (
            <>
              {displayedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  isAnimating={isAnimating}
                  dateFormatPreference={user?.date_format_preference || "relative"}
                />
              ))}
              {/* Infinite scroll trigger */}
              <div ref={observerTarget} className="col-span-full h-10" />
              {/* Loading more indicator */}
              {isLoadingMore && <LoadingSpinner />}
              {/* End of results message */}
              {!hasMore && !isLoadingMore && displayedArticles.length > 0 && (
                <div className="col-span-full text-center py-6">
                  <div className="inline-flex items-center gap-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-full px-8 py-4 shadow-lg">
                    <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[var(--text-primary)] font-semibold">
                      You've reached the end of the adventures!
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <NoResults />
          )}
        </main>
      </div>
    </>
  );
}
