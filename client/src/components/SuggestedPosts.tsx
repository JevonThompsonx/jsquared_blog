import { useEffect, useState, FC, SyntheticEvent } from "react";
import { Link } from "react-router-dom";
import { Post } from "../../../shared/src/types";
import { calculateReadingTime, formatReadingTime } from "../utils/readingTime";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateTime";

interface SuggestedPostsProps {
  category?: string; // Filter by category
  excludeId?: number; // Exclude a specific post ID
  limit?: number; // Number of posts to show
  title?: string; // Custom title for the section
}

// Strip HTML tags - done once during data transformation
const stripHtml = (html: string | null): string => {
  if (!html) return "";
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const SuggestedPosts: FC<SuggestedPostsProps> = ({
  category,
  excludeId,
  limit = 4,
  title = "You Might Also Like"
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSuggestedPosts = async () => {
      setLoading(true);
      try {
        // Build query parameters
        const params = new URLSearchParams({
          limit: String(limit + 5), // Fetch extra in case we need to exclude some
          offset: "0"
        });

        if (category) {
          params.append("search", category);
        }

        const response = await fetch(`/api/posts?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch suggested posts");
        }

        const data = await response.json();
        let filteredPosts = data.posts || [];

        // Filter by category if specified
        if (category) {
          filteredPosts = filteredPosts.filter((post: Post) => post.category === category);
        }

        // Exclude the current post if specified
        if (excludeId) {
          filteredPosts = filteredPosts.filter((post: Post) => post.id !== excludeId);
        }

        // Strip HTML and limit to requested number
        const postsWithStrippedHtml = filteredPosts.slice(0, limit).map((post: Post) => ({
          ...post,
          description: stripHtml(post.description)
        }));
        setPosts(postsWithStrippedHtml);
      } catch (error) {
        console.error("Error fetching suggested posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestedPosts();
  }, [category, excludeId, limit]);

  const handleImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found";
  };

  if (loading) {
    return (
      <div className="py-6">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--spinner)]"></div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return null; // Don't show section if no suggested posts
  }

  return (
    <section className="py-10 border-t border-[var(--border)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-8 text-center">
          {title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {posts.map((post) => {
            const formattedDate = formatDate(post.created_at, user?.date_format_preference || "relative");
            return (
              <Link
                key={post.id}
                to={`/posts/${post.id}`}
                className="group block"
              >
                <div className="h-full rounded-lg overflow-hidden shadow-lg bg-[var(--card-bg)] border border-[var(--border)] transition-all duration-300 hover:border-[var(--primary)] hover:shadow-xl flex flex-col">
                  {/* Image */}
                  <div className="h-48 overflow-hidden">
                    <img
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      src={post.image_url || "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found"}
                      alt={post.title}
                      onError={handleImageError}
                      loading="lazy"
                    />
                  </div>
                  {/* Content */}
                  <div className="p-4 flex-grow flex flex-col">
                    {post.category && (
                      <span className="text-xs text-[var(--primary)] font-semibold uppercase mb-2">
                        {post.category}
                      </span>
                    )}
                    <h3 className="font-bold text-base leading-tight text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                    {post.description && (
                      <p className="text-sm text-[var(--text-secondary)] flex-grow line-clamp-2 mb-2">
                        {post.description}
                      </p>
                    )}
                    <span className="text-[var(--primary)] text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all duration-200 mb-3">
                      Continue reading
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mt-auto">
                      <span>{formattedDate}</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatReadingTime(calculateReadingTime(post.description))}
                      </span>
                    </div>
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
