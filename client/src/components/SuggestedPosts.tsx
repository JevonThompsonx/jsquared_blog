import { FC, SyntheticEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Post } from "../../../shared/src/types";
import { calculateReadingTime, formatReadingTime } from "../utils/readingTime";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateTime";
import { apiPath } from "../utils/api";

type SuggestedPostsProps = {
  category?: string;
  excludeId?: number;
  limit?: number;
  title?: string;
};

const stripHtml = (html: string | null): string => {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const SuggestedPosts: FC<SuggestedPostsProps> = ({
  category,
  excludeId,
  limit = 4,
  title = "More adventures to open next",
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSuggestedPosts = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          limit: String(limit + 5),
          offset: "0",
        });

        if (category) {
          params.append("search", category);
        }

        const response = await fetch(apiPath(`/api/posts?${params}`));
        if (!response.ok) {
          throw new Error("Failed to fetch suggested posts");
        }

        const data = await response.json();
        let filteredPosts = data.posts || [];

        if (category) {
          filteredPosts = filteredPosts.filter((post: Post) => (post.category || "General") === category);
        }

        if (excludeId) {
          filteredPosts = filteredPosts.filter((post: Post) => post.id !== excludeId);
        }

        setPosts(
          filteredPosts.slice(0, limit).map((post: Post) => ({
            ...post,
            description: stripHtml(post.description),
          })),
        );
      } catch (error) {
        console.error("Error fetching suggested posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestedPosts();
  }, [category, excludeId, limit]);

  const handleImageError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    event.currentTarget.src = "https://placehold.co/900x700/EEE/31343C?text=Image+Not+Found";
  };

  if (loading) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--spinner)]"></div>
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--primary)] mb-2">Suggested Reading</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-[var(--text-primary)]">{title}</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
            Keep the adventure going with nearby routes, shared moods, and posts that pair sweetly with the one you just opened.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {posts.map((post) => {
            const formattedDate = formatDate(post.created_at, user?.date_format_preference || "relative");

            return (
              <Link
                key={post.id}
                to={`/posts/${post.id}`}
                className="group block h-full rounded-[1.75rem] border border-[var(--border)] bg-[var(--card-bg)] shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/60 hover:shadow-[0_24px_80px_rgba(15,23,42,0.14)]"
              >
                <div className="overflow-hidden rounded-t-[1.75rem] h-48">
                  <img
                    src={post.image_url || "https://placehold.co/900x700/EEE/31343C?text=Image+Not+Found"}
                    alt={post.title}
                    onError={handleImageError}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                <div className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                    <span>{post.category || "General"}</span>
                    <span>{formattedDate}</span>
                  </div>
                  <h3 className="text-xl font-semibold leading-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)] line-clamp-2">
                    {post.title}
                  </h3>
                  {post.description && (
                    <p className="text-sm leading-7 text-[var(--text-secondary)] line-clamp-3 flex-grow">
                      {post.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-4 text-sm">
                    <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatReadingTime(calculateReadingTime(post.description))}
                    </span>
                    <span className="inline-flex items-center gap-2 text-[var(--primary)] transition-transform duration-200 group-hover:translate-x-1">
                      Read
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SuggestedPosts;
