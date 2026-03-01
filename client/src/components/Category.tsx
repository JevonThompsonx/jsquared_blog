import { useEffect, useState, FC, SyntheticEvent, useMemo, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Post, Article } from "../../../shared/src/types";
import SEO from "./SEO";
import SuggestedPosts from "./SuggestedPosts";
import Breadcrumbs from "./Breadcrumbs";
import { SkeletonGrid } from "./SkeletonCard";
import { CategoryIcon } from "../utils/categoryIcons";
import RelatedCategories from "./RelatedCategories";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateTime";

// Small spinner for "loading more" at bottom
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

// Strip HTML tags - done once during data transformation, not on every render
const stripHtml = (html: string): string => {
  if (!html) return "";
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

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
      description: stripHtml(post.description || ""), // Strip HTML once here
      date: post.created_at,
      gridClass: gridClass,
      dynamicViewType: post.type,
      status: post.status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Post type lacks tags field but API returns it at runtime
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
  dateFormatPreference?: "relative" | "absolute";
}

const ArticleCard: FC<ArticleCardProps> = ({ article, dateFormatPreference = "relative" }) => {
  const navigate = useNavigate();
  const { id, image, category, title, date, description, gridClass, tags } = article;
  const categoryLabel = category || "General";
  const formattedDate = formatDate(date, dateFormatPreference);
  const isNew = article.status === "published" && isNewPost(date);
  const handleImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src =
      "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found";
  };

  if (article.dynamicViewType === "hover") {
    return (
      <div
        onClick={() => navigate(`/posts/${id}`)}
        role="link"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigate(`/posts/${id}`);
          }
        }}
        className={`${gridClass} cursor-pointer`}
      >
        <div className="group relative h-full rounded-lg overflow-hidden shadow-lg">
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
            <div className="tracking-wide text-xs text-[var(--primary-light)] font-semibold uppercase">
              {categoryLabel}
            </div>
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
        </div>
      </div>
    );
  }

  if (article.dynamicViewType === "split-horizontal") {
    return (
      <div
        onClick={() => navigate(`/posts/${id}`)}
        role="link"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigate(`/posts/${id}`);
          }
        }}
        className={`${gridClass} cursor-pointer`}
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
            <div className="tracking-wide text-xs text-[var(--primary)] font-semibold uppercase">
              {categoryLabel}
            </div>
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
              <h3 className="mt-1 text-lg md:text-xl font-bold leading-tight text-[var(--text-primary)]">
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
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/posts/${id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(`/posts/${id}`);
        }
      }}
      className={`${gridClass} cursor-pointer`}
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
          <div className="tracking-wide text-xs text-[var(--primary)] font-semibold uppercase">
            {categoryLabel}
          </div>
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
          <h3 className="mt-1 font-bold text-lg leading-tight text-[var(--text-primary)]">
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
    </div>
  );
};

const Category: FC = () => {
  const { category } = useParams<{ category: string }>();
  const { user } = useAuth();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
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
      });

      const response = await fetch(`/api/posts?${params}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      // Filter to only posts matching this exact category
      const normalizedCategory = categoryName.toLowerCase();
      const categoryPosts = (data.posts || []).filter((post: Post) => {
        const postCategory = (post.category || "General").toLowerCase();
        return postCategory === normalizedCategory;
      });

      if (isInitial) {
        setAllPosts(categoryPosts);
        setTotalCount(data.total || categoryPosts.length);
      } else {
        setAllPosts(prev => {
          const newPosts = [...prev, ...categoryPosts];
          setTotalCount(data.total || newPosts.length);
          return newPosts;
        });
      }

      setHasMore(categoryPosts.length === POSTS_PER_PAGE && data.hasMore !== false);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (category) {
      // Scroll to top when category page loads
      window.scrollTo({ top: 0, behavior: 'instant' });
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
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: category || "Category" },
          ]}
        />
        <h1 className="text-4xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <CategoryIcon category={category || ""} className="w-8 h-8" />
          {category} Adventures
        </h1>
        <p className="text-[var(--text-secondary)] mt-2">
          {totalCount > 0 && (
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <strong>{totalCount}{hasMore && '+'}</strong> {totalCount === 1 ? 'adventure' : 'adventures'} in {category}
            </span>
          )}
          {totalCount === 0 && !isLoading && `No adventures found in ${category}`}
        </p>
      </div>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 auto-rows-[minmax(300px,auto)] grid-flow-dense">
        {isLoading ? (
          <SkeletonGrid count={6} />
        ) : displayedArticles.length > 0 ? (
          <>
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
              <div className="col-span-full text-center py-6">
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

      {/* Related Categories Widget */}
      {category && !isLoading && (
        <RelatedCategories currentCategory={category} limit={8} />
      )}

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
