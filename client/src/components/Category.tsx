import { useEffect, useState, FC, SyntheticEvent, useMemo, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Post, Article } from "../../../shared/src/types";
import SEO from "./SEO";
import SuggestedPosts from "./SuggestedPosts";

const LoadingSpinner: FC = () => (
  <div className="flex justify-center items-center col-span-full py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--spinner)]"></div>
  </div>
);

const NoResults: FC<{ category: string }> = ({ category }) => (
  <div className="col-span-full bg-[var(--card-bg)] shadow-xl border border-[var(--border)] rounded-2xl p-12 text-center">
    <svg className="w-16 h-16 mx-auto mb-4 text-[var(--text-secondary)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
      No Adventures Found
    </h3>
    <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
      No posts found in the "{category}" category. Check back later for new adventures!
    </p>
  </div>
);

const assignLayoutAndGridClass = (posts: Post[]): Article[] => {
  return posts.map((post) => {
    let gridClass = "col-span-1";

    if (post.type === "split-horizontal") {
      gridClass = "col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2";
    } else if (post.type === "split-vertical") {
      gridClass = "col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1";
    } else if (post.type === "hover") {
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
}

const ArticleCard: FC<ArticleCardProps> = ({ article }) => {
  const { id, image, category, title, date, description, gridClass } = article;
  const formattedDate = formatDateToSeasonYear(date);
  const handleImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src =
      "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found";
  };

  if (article.dynamicViewType === "hover") {
    return (
      <Link to={`/posts/${id}`} className={`${gridClass}`}>
        <div className="group relative h-full rounded-lg overflow-hidden shadow-lg">
          <img
            className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
            src={image}
            alt={title}
            onError={handleImageError}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 p-4 md:p-6 right-0">
            <div className="tracking-wide text-xs text-[var(--primary-light)] font-semibold uppercase">
              {category}
            </div>
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
        </div>
      </Link>
    );
  }

  if (article.dynamicViewType === "split-horizontal") {
    return (
      <Link to={`/posts/${id}`} className={`${gridClass}`}>
        <div className="group h-full rounded-lg overflow-hidden shadow-lg bg-[var(--card-bg)] border border-[var(--border)] transition-all duration-300 hover:border-[var(--primary)] hover:shadow-xl flex flex-col md:flex-row">
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
              <div className="tracking-wide text-xs text-[var(--primary)] font-semibold uppercase">
                {category}
              </div>
              <h3 className="mt-1 text-lg md:text-xl font-bold leading-tight text-[var(--text-primary)]">
                {title}
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
            </div>
            <div className="mt-4 text-xs text-[var(--text-secondary)]">
              {formattedDate}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/posts/${id}`} className={`${gridClass}`}>
      <div className="group h-full rounded-lg overflow-hidden shadow-lg bg-[var(--card-bg)] border border-[var(--border)] transition-all duration-300 hover:border-[var(--primary)] hover:shadow-xl flex flex-col">
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
          <div className="tracking-wide text-xs text-[var(--primary)] font-semibold uppercase">
            {category}
          </div>
          <h3 className="mt-1 font-bold text-lg leading-tight text-[var(--text-primary)]">
            {title}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)] flex-grow">
            {description}
          </p>
          <p className="mt-4 text-xs text-[var(--text-secondary)] self-start">
            {formattedDate}
          </p>
        </div>
      </div>
    </Link>
  );
};

const Category: FC = () => {
  const { category } = useParams<{ category: string }>();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  const POSTS_PER_PAGE = 20;

  const fetchPosts = useCallback(async (currentOffset: number, categoryName: string, isInitial: boolean = false) => {
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        limit: POSTS_PER_PAGE.toString(),
        offset: currentOffset.toString(),
        search: categoryName, // Use search to filter by category
      });

      const response = await fetch(`/api/posts?${params}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      // Filter to only posts matching this exact category
      const categoryPosts = (data.posts || []).filter((post: Post) =>
        post.category === categoryName
      );

      if (isInitial) {
        setAllPosts(categoryPosts);
      } else {
        setAllPosts(prev => [...prev, ...categoryPosts]);
      }

      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (category) {
      setOffset(0);
      setAllPosts([]);
      fetchPosts(0, category, true);
    }
  }, [category, fetchPosts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore && category) {
          const newOffset = offset + POSTS_PER_PAGE;
          setOffset(newOffset);
          fetchPosts(newOffset, category, false);
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
  }, [hasMore, isLoading, isLoadingMore, offset, category, fetchPosts]);

  const displayedArticles = useMemo<Article[]>(() => {
    return assignLayoutAndGridClass(allPosts);
  }, [allPosts]);

  return (
    <>
      <SEO
        title={`${category} Adventures`}
        description={`Explore all ${category} posts from J²Adventures. Discover stories, photos, and experiences from our ${category} adventures around the world.`}
        type="website"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://jsquaredadventures.com"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": `${category} Adventures`,
              "item": `https://jsquaredadventures.com/category/${encodeURIComponent(category || '')}`
            }
          ]
        }}
      />
      <div className="min-h-screen pt-24 pb-12" style={{ background: 'var(--background)' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mt-6">
          {category} Adventures
        </h1>
        <p className="text-[var(--text-secondary)] mt-2">
          Explore all posts in the {category} category
        </p>
      </div>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 auto-rows-[minmax(300px,auto)] grid-flow-dense">
        {isLoading ? (
          <LoadingSpinner />
        ) : displayedArticles.length > 0 ? (
          <>
            {displayedArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
            <div ref={observerTarget} className="col-span-full h-10" />
            {isLoadingMore && <LoadingSpinner />}
            {!hasMore && !isLoadingMore && displayedArticles.length > 0 && (
              <div className="col-span-full text-center py-12">
                <div className="inline-flex items-center gap-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-full px-8 py-4 shadow-lg">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[var(--text-primary)] font-semibold">
                    You've reached the end!
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <NoResults category={category || ""} />
        )}
      </main>

      {/* Suggested Posts from other categories */}
      <SuggestedPosts
        limit={4}
        title="Explore Other Adventures"
      />
      </div>
    </>
  );
};

export default Category;
