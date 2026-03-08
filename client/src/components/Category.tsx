import { FC, SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Article, Post } from "../../../shared/src/types";
import { useAuth } from "../context/AuthContext";
import SEO from "./SEO";
import Breadcrumbs from "./Breadcrumbs";
import SuggestedPosts from "./SuggestedPosts";
import RelatedCategories from "./RelatedCategories";
import { SkeletonGrid } from "./SkeletonCard";
import { CategoryIcon } from "../utils/categoryIcons";
import { formatDate } from "../utils/dateTime";
import { apiPath } from "../utils/api";

const POSTS_PER_PAGE = 20;

const LoadingSpinner: FC = () => (
  <div className="flex justify-center items-center col-span-full py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--spinner)]"></div>
  </div>
);

const NoResults: FC<{ category: string }> = ({ category }) => (
  <div className="col-span-full rounded-[2rem] border border-[var(--border)] bg-[var(--card-bg)] p-12 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
    <p className="text-xs uppercase tracking-[0.35em] text-[var(--primary)] mb-3">Category Empty</p>
    <h3 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">No adventures tucked into {category}</h3>
    <p className="mx-auto max-w-xl text-sm text-[var(--text-secondary)]">
      This corner is still waiting for its next memory. Try another category or head back home for more adventures.
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
  return posts.map((post) => ({
    id: post.id,
    image: post.image_url || "https://placehold.co/900x700/EEE/31343C?text=Image+Not+Found",
    category: post.category || "General",
    title: post.title,
    description: stripHtml(post.description || ""),
    date: post.created_at,
    gridClass: post.type === "split-horizontal" ? "col-span-1 lg:col-span-2" : "col-span-1",
    dynamicViewType: post.type,
    status: post.status,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API includes tags at runtime
    tags: (post as any).tags || [],
  }));
};

type ArticleCardProps = {
  article: Article;
  dateFormatPreference?: "relative" | "absolute";
};

const ArticleCard: FC<ArticleCardProps> = ({ article, dateFormatPreference = "relative" }) => {
  const { id, image, category, title, date, description, gridClass, tags, status } = article;
  const formattedDate = formatDate(date, dateFormatPreference);

  const handleImageError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    event.currentTarget.src = "https://placehold.co/900x700/EEE/31343C?text=Image+Not+Found";
  };

  return (
    <article className={gridClass}>
      <Link
        to={`/posts/${id}`}
        className="group block h-full rounded-[2rem] border border-[var(--border)] bg-[var(--card-bg)] shadow-[0_24px_80px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/60 hover:shadow-[0_28px_90px_rgba(15,23,42,0.14)]"
      >
        <div className="relative h-72 overflow-hidden rounded-t-[2rem]">
          <img
            src={image}
            alt={title}
            onError={handleImageError}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.55))]" />
          <div className="absolute left-5 top-5 right-5 flex items-start justify-between gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-md">
              <CategoryIcon category={category} className="h-3.5 w-3.5" />
              {category}
            </span>
            {status === "draft" && <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-amber-950">DRAFT</span>}
            {status === "scheduled" && <span className="rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-white">SCHEDULED</span>}
            {status === "published" && isNewPost(date) && <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-white">NEW</span>}
          </div>
        </div>

        <div className="flex h-full flex-col gap-4 p-6 sm:p-7">
          <div className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{formattedDate}</div>
          <h2 className="text-2xl font-semibold leading-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
            {title}
          </h2>
          <p className="text-sm leading-7 text-[var(--text-secondary)] line-clamp-4">{description}</p>

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {tags.slice(0, 4).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-[var(--border)] bg-[var(--background)]/90 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-4 text-sm">
            <span className="font-medium text-[var(--text-primary)]">Open Adventure</span>
            <span className="inline-flex items-center gap-2 text-[var(--primary)] transition-transform duration-200 group-hover:translate-x-1">
              Wander In
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
};

const Category: FC = () => {
  const { category } = useParams<{ category: string }>();
  const { user } = useAuth();

  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  const categoryName = category || "General";

  const fetchPosts = useCallback(async (currentOffset: number, name: string, isInitial: boolean = false) => {
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

      const response = await fetch(apiPath(`/api/posts?${params}`));
      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const data = await response.json();
      const normalized = name.toLowerCase();
      const categoryPosts = (data.posts || []).filter((post: Post) => (post.category || "General").toLowerCase() === normalized);

      if (isInitial) {
        setAllPosts(categoryPosts);
        setTotalCount(data.total || categoryPosts.length);
      } else {
        setAllPosts((prev) => [...prev, ...categoryPosts]);
        setTotalCount((prev) => Math.max(prev, categoryPosts.length));
      }

      setHasMore(categoryPosts.length === POSTS_PER_PAGE && data.hasMore !== false);
    } catch (error) {
      console.error("Failed to fetch category posts:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setOffset(0);
    setAllPosts([]);
    fetchPosts(0, categoryName, true);
  }, [categoryName, fetchPosts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          const newOffset = offset + POSTS_PER_PAGE;
          setOffset(newOffset);
          fetchPosts(newOffset, categoryName, false);
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [categoryName, fetchPosts, hasMore, isLoading, isLoadingMore, offset]);

  const displayedArticles = useMemo(() => assignLayoutAndGridClass(allPosts), [allPosts]);

  return (
    <>
      <SEO
        title={`${categoryName} Adventures`}
        description={`Explore ${categoryName} adventures from J²Adventures.`}
        type="website"
      />

      <div className="min-h-screen bg-[var(--background)] pt-24 pb-16">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: categoryName },
            ]}
          />

          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--primary)] mb-4">Category Archive</p>
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-[var(--text-primary)]">
                  <CategoryIcon category={categoryName} className="h-9 w-9" />
                  <h1 className="text-4xl md:text-5xl font-semibold leading-tight">{categoryName}</h1>
                </div>
                <p className="max-w-2xl text-base md:text-lg leading-8 text-[var(--text-secondary)]">
                  Everything currently tucked into {categoryName}, from fresh little escapes to favorite throwback adventures.
                </p>
              </div>
              <div className="rounded-full bg-[var(--background)] px-5 py-3 text-sm font-medium text-[var(--text-primary)]">
                {totalCount > 0 ? `${totalCount}${hasMore ? "+" : ""} posts` : "No posts yet"}
              </div>
            </div>
          </div>
        </section>

        <main className="container mx-auto px-4 sm:px-6 lg:px-8">
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
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              <NoResults category={categoryName} />
            </div>
          )}
        </main>

        {categoryName && !isLoading && (
          <RelatedCategories currentCategory={categoryName} limit={8} />
        )}

        <SuggestedPosts limit={4} title="More adventures you might love" />
      </div>
    </>
  );
};

export default Category;
