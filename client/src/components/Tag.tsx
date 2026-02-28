import { useEffect, useState, FC, SyntheticEvent, useMemo, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Post, Article, Tag as TagType } from "../../../shared/src/types";
import SEO from "./SEO";
import SuggestedPosts from "./SuggestedPosts";
import Breadcrumbs from "./Breadcrumbs";
import { SkeletonGrid } from "./SkeletonCard";
import RelatedTags from "./RelatedTags";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateTime";

// Small spinner for "loading more" at bottom
const LoadingSpinner: FC = () => (
  <div className="flex justify-center items-center col-span-full py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--spinner)]"></div>
  </div>
);

const NoResults: FC<{ tagName: string }> = ({ tagName }) => (
  <div className="col-span-full bg-[var(--card-bg)] shadow-xl border border-[var(--border)] rounded-2xl p-12 text-center">
    <svg className="w-16 h-16 mx-auto mb-4 text-[var(--text-secondary)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
      No Adventures Found
    </h3>
    <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
      No posts found with the "{tagName}" tag. Check back later for new adventures!
    </p>
  </div>
);

// Strip HTML tags
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
      description: stripHtml(post.description || ""),
      date: post.created_at,
      gridClass: gridClass,
      dynamicViewType: post.type,
      status: post.status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Post type lacks tags field but API returns it at runtime
      tags: (post as any).tags || [],
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
  const { id, image, category, title, date, description, gridClass, tags } = article;
  const formattedDate = formatDate(date, dateFormatPreference);
  const isNew = article.status === "published" && isNewPost(date);
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
            <Link
              to={`/category/${encodeURIComponent(category)}`}
              onClick={(e) => e.stopPropagation()}
              className="tracking-wide text-xs text-[var(--primary-light)] font-semibold uppercase hover:underline"
            >
              {category}
            </Link>
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
      </Link>
    );
  }

  if (article.dynamicViewType === "split-horizontal") {
    return (
      <Link to={`/posts/${id}`} className={`${gridClass}`}>
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
              <Link
                to={`/category/${encodeURIComponent(category)}`}
                onClick={(e) => e.stopPropagation()}
                className="tracking-wide text-xs text-[var(--primary)] font-semibold uppercase hover:underline"
              >
                {category}
              </Link>
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
      </Link>
    );
  }

  return (
    <Link to={`/posts/${id}`} className={`${gridClass}`}>
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
          <Link
            to={`/category/${encodeURIComponent(category)}`}
            onClick={(e) => e.stopPropagation()}
            className="tracking-wide text-xs text-[var(--primary)] font-semibold uppercase hover:underline"
          >
            {category}
          </Link>
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
    </Link>
  );
};

const TagPage: FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [tag, setTag] = useState<TagType | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const POSTS_PER_PAGE = 20;

  const fetchPosts = useCallback(async (currentOffset: number, tagSlug: string, isInitial: boolean = false) => {
    if (isInitial) {
      setIsLoading(true);
      setNotFound(false);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        limit: POSTS_PER_PAGE.toString(),
        offset: currentOffset.toString(),
      });

      const response = await fetch(`/api/tags/${tagSlug}/posts?${params}`);
      
      if (response.status === 404) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      const filteredPosts = (data.posts || []).filter((post: Post) =>
        post.status === "published"
      );

      if (isInitial) {
        setTag(data.tag);
        setAllPosts(filteredPosts);
        setTotalCount(data.total || filteredPosts.length || 0);
      } else {
        setAllPosts(prev => [...prev, ...filteredPosts]);
      }

      setHasMore(filteredPosts.length === POSTS_PER_PAGE && data.hasMore !== false);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (slug) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      setOffset(0);
      setAllPosts([]);
      setTag(null);
      fetchPosts(0, slug, true);
    }
  }, [slug, fetchPosts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore && slug) {
          const newOffset = offset + POSTS_PER_PAGE;
          setOffset(newOffset);
          fetchPosts(newOffset, slug, false);
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
  }, [hasMore, isLoading, isLoadingMore, offset, slug, fetchPosts]);

  const displayedArticles = useMemo<Article[]>(() => {
    return assignLayoutAndGridClass(allPosts);
  }, [allPosts]);

  if (notFound) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <svg className="w-20 h-20 mx-auto mb-6 text-[var(--text-secondary)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Tag Not Found</h1>
          <p className="text-[var(--text-secondary)] mb-6">The tag "{slug}" doesn't exist.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={tag ? `${tag.name} Posts` : "Tag"}
        description={tag ? `Explore all posts tagged with "${tag.name}" on J²Adventures. Discover stories, photos, and experiences.` : ""}
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
              "name": tag?.name || "Tag",
              "item": `https://jsquaredadventures.com/tag/${slug}`
            }
          ]
        }}
      />
      <div className="min-h-screen pt-24 pb-12" style={{ background: 'var(--background)' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: tag?.name || slug || "Tag" },
            ]}
          />
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <h1 className="text-4xl font-bold text-[var(--text-primary)]">
              {tag?.name || slug}
            </h1>
          </div>
          <p className="text-[var(--text-secondary)] mt-2">
            {totalCount > 0 && (
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <strong>{totalCount}{hasMore && '+'}</strong> {totalCount === 1 ? 'adventure' : 'adventures'} tagged with {tag?.name || slug}
              </span>
            )}
            {totalCount === 0 && !isLoading && `No adventures found with this tag`}
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
            <NoResults tagName={tag?.name || slug || ""} />
          )}
        </main>

        {/* Related Tags Widget */}
        {slug && !isLoading && (
          <RelatedTags currentTagSlug={slug} limit={8} />
        )}

        {/* Suggested Posts */}
        <SuggestedPosts
          limit={4}
          title="Explore More Adventures"
        />
      </div>
    </>
  );
};

export default TagPage;
