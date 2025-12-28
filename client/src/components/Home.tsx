

import { useEffect, useMemo, FC, SyntheticEvent, useState, useRef, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Post, Article } from "../../../shared/src/types";
import { useDebounce } from "../hooks/useDebounce";

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
      description: post.description || "",
      date: post.created_at,
      gridClass: gridClass,
      dynamicViewType: post.type,
    };
  });
};

const formatDateToSeasonYear = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 2 && month <= 4) return `Spring ${year}`;
  if (month >= 5 && month <= 7) return `Summer ${year}`;
  if (month >= 8 && month <= 10) return `Fall ${year}`;
  return `Winter ${year}`;
};

interface ArticleCardProps {
  article: Article;
  isAnimating?: boolean;
}
const ArticleCard: FC<ArticleCardProps> = ({ article, isAnimating }) => {
  const { id, image, category, title, date, description, gridClass } = article;
  const formattedDate = formatDateToSeasonYear(date);
  const handleImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src =
      "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found";
  };

  // STYLE 1: HOVER - Image with overlay that reveals description on hover
  if (article.dynamicViewType === "hover") {
    return (
      <div className={`${gridClass} ${isAnimating ? "transition-all duration-1000 ease-out transform scale-0 opacity-0" : "transition-all duration-1000 ease-out transform scale-100 opacity-100"}`}>
        <div className="group relative h-full rounded-lg overflow-hidden shadow-lg">
          <Link to={`/posts/${id}`} className="block h-full">
            <img
              className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
              src={image}
              alt={title}
              onError={handleImageError}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 p-4 md:p-6 right-0">
              <Link
                to={`/category/${encodeURIComponent(category)}`}
                className="inline-block tracking-wide text-xs text-[var(--primary-light)] font-semibold uppercase hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {category}
              </Link>
              <h3 className="mt-1 text-lg md:text-xl font-bold leading-tight text-white">
                {title}
              </h3>
              <div className="text-gray-300 text-xs mt-2">
                {formattedDate}
              </div>
              <p className="mt-2 text-gray-200 text-sm opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-20 transition-all duration-300 ease-in-out overflow-hidden">
                {description}
              </p>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  // STYLE 2: SPLIT-HORIZONTAL - Side by side layout with image and content
  if (article.dynamicViewType === "split-horizontal") {
    return (
      <div className={`${gridClass} ${isAnimating ? "transition-all duration-1000 ease-out transform scale-0 opacity-0" : "transition-all duration-1000 ease-out transform scale-100 opacity-100"}`}>
        <div className="group h-full rounded-lg overflow-hidden shadow-lg bg-[var(--card-bg)] border border-[var(--border)] transition-all duration-300 hover:border-[var(--primary)] hover:shadow-xl flex flex-col md:flex-row">
          <Link to={`/posts/${id}`} className="md:w-1/2 h-64 md:h-auto">
            <img
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              src={image}
              alt={title}
              onError={handleImageError}
              loading="lazy"
            />
          </Link>
          <div className="md:w-1/2 p-4 md:p-6 flex flex-col justify-between">
            <div>
              <Link
                to={`/category/${encodeURIComponent(category)}`}
                className="inline-block tracking-wide text-xs text-[var(--primary)] font-semibold uppercase hover:underline"
              >
                {category}
              </Link>
              <Link to={`/posts/${id}`}>
                <h3 className="mt-1 text-lg md:text-xl font-bold leading-tight text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
              </Link>
            </div>
            <div className="mt-4 text-xs text-[var(--text-secondary)]">
              {formattedDate}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STYLE 3: SPLIT-VERTICAL - Image on top, content below
  return (
    <div className={`${gridClass} ${isAnimating ? "transition-all duration-1000 ease-out transform scale-0 opacity-0" : "transition-all duration-1000 ease-out transform scale-100 opacity-100"}`}>
      <div className="group h-full rounded-lg overflow-hidden shadow-lg bg-[var(--card-bg)] border border-[var(--border)] transition-all duration-300 hover:border-[var(--primary)] hover:shadow-xl flex flex-col">
        <Link to={`/posts/${id}`} className="h-56">
          <img
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            src={image}
            alt={title}
            onError={handleImageError}
            loading="lazy"
          />
        </Link>
        <div className="p-4 md:p-6 flex-grow flex flex-col">
          <Link
            to={`/category/${encodeURIComponent(category)}`}
            className="inline-block tracking-wide text-xs text-[var(--primary)] font-semibold uppercase hover:underline"
          >
            {category}
          </Link>
          <Link to={`/posts/${id}`}>
            <h3 className="mt-1 font-bold text-lg leading-tight text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors">
              {title}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)] flex-grow">
              {description}
            </p>
          </Link>
          <p className="mt-4 text-xs text-[var(--text-secondary)] self-start">
            {formattedDate}
          </p>
        </div>
      </div>
    </div>
  );
};

interface HomeProps {
  searchTerm: string;
}

export default function Home() {
  const { user } = useAuth();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const { searchTerm } = useOutletContext<HomeProps>();
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const POSTS_PER_PAGE = 20;

  const fetchPosts = useCallback(async (currentOffset: number, search: string, isInitial: boolean = false) => {
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

      const response = await fetch(`/api/posts?${params}`);
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
      if (isInitial) {
        setIsAnimating(false);
      }
    }
  }, []);

  // Initial load and search changes
  useEffect(() => {
    setOffset(0);
    setAllPosts([]);
    fetchPosts(0, debouncedSearchTerm, true);
  }, [debouncedSearchTerm, fetchPosts]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          const newOffset = offset + POSTS_PER_PAGE;
          setOffset(newOffset);
          fetchPosts(newOffset, debouncedSearchTerm, false);
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
  }, [hasMore, isLoading, isLoadingMore, offset, debouncedSearchTerm, fetchPosts]);

  // Show content on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (mainContentRef.current) {
        const { top } = mainContentRef.current.getBoundingClientRect();
        if (top <= window.innerHeight * 0.5) {
          setShowContent(true);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const displayedArticles = useMemo<Article[]>(() => {
    return assignLayoutAndGridClass(allPosts);
  }, [allPosts]);

  return (
    <>
      <div
        className="landing-page"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1682686578842-00ba49b0a71a?q=80&w=1075&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`,
        }}
      >
        <div className="welcome-text backdrop-blur-sm">
          <h1 className="landing-title drop-shadow-lg">J²Adventures</h1>
          <p className="landing-subtitle drop-shadow-md">
            Exploring the world, one adventure at a time.
          </p>
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
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 text-center shadow-lg">
              <p className="text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--primary)]">Welcome back,</span> {user.email}!
              </p>
            </div>
          </div>
        )}

        <main className="container mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 auto-rows-[minmax(300px,auto)] grid-flow-dense">
          {isLoading ? (
            <LoadingSpinner />
          ) : displayedArticles.length > 0 ? (
            <>
              {displayedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  isAnimating={isAnimating}
                />
              ))}
              {/* Infinite scroll trigger */}
              <div ref={observerTarget} className="col-span-full h-10" />
              {/* Loading more indicator */}
              {isLoadingMore && <LoadingSpinner />}
              {/* End of results message */}
              {!hasMore && !isLoadingMore && displayedArticles.length > 0 && (
                <div className="col-span-full text-center py-12">
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
