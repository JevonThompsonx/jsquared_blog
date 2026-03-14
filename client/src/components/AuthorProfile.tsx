import { useEffect, useState, FC, SyntheticEvent, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Post, Article, AuthorProfile as AuthorProfileType, PostWithTags } from "../../../shared/src/types";
import SEO from "./SEO";
import Breadcrumbs from "./Breadcrumbs";
import { SkeletonGrid } from "./SkeletonCard";
import { CategoryIcon } from "../utils/categoryIcons";
import ProfileAvatar from "./ProfileAvatar";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateTime";

// Small spinner for "loading more" at bottom
const LoadingSpinner: FC = () => (
  <div className="flex justify-center items-center col-span-full py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--spinner)]"></div>
  </div>
);

const NoResults: FC<{ username: string }> = ({ username }) => (
  <div className="col-span-full bg-[var(--card-bg)] shadow-xl border border-[var(--border)] rounded-2xl p-12 text-center">
    <svg className="w-16 h-16 mx-auto mb-4 text-[var(--text-secondary)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
      No Adventures Yet
    </h3>
    <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
      @{username} hasn't published any adventures yet. Check back later!
    </p>
  </div>
);

const PrivateProfile: FC<{ username: string; avatarUrl: string | null }> = ({ username, avatarUrl }) => (
  <div className="min-h-screen bg-[var(--background)] pt-24 pb-12">
    <div className="max-w-4xl mx-auto px-4">
      <div className="bg-[var(--card-bg)] shadow-xl border border-[var(--border)] rounded-2xl p-12 text-center">
        <ProfileAvatar
          avatarUrl={avatarUrl}
          username={username}
          size="lg"
          className="mx-auto mb-6"
        />
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          @{username}
        </h1>
        <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)] mb-6">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>This profile is private</span>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Back to Home
        </Link>
      </div>
    </div>
  </div>
);

const NotFound: FC = () => (
  <div className="min-h-screen bg-[var(--background)] pt-24 pb-12">
    <div className="max-w-4xl mx-auto px-4">
      <div className="bg-[var(--card-bg)] shadow-xl border border-[var(--border)] rounded-2xl p-12 text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-[var(--text-secondary)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
          Author Not Found
        </h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-6">
          We couldn't find an author with that username. They may have changed their username or the profile doesn't exist.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
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
    }
    return {
      id: post.id,
      image: post.image_url || "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found",
      category: post.category || "General",
      title: post.title,
      description: stripHtml(post.description || ""),
      date: post.created_at,
      gridClass: gridClass,
      dynamicViewType: post.type,
      status: post.status,
      tags: (post as PostWithTags).tags || [],
    };
  });
};

interface ArticleCardProps {
  article: Article;
  dateFormatPreference?: "seasonal" | "relative" | "absolute";
}

const ArticleCard: FC<ArticleCardProps> = ({ article, dateFormatPreference = "relative" }) => {
  const { id, image, category, title, date, description, gridClass, tags } = article;
  const formattedDate = formatDate(date, dateFormatPreference);
  const navigate = useNavigate();
  
  const handleImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found";
  };

  // Handle navigation to category/tag without nested <a> tags
  const handleCategoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/category/${encodeURIComponent(category)}`);
  };

  const handleTagClick = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/tag/${slug}`);
  };

  // Simple card style for author profile
  return (
    <Link to={`/posts/${id}`} className={`${gridClass}`}>
      <div className="group h-full bg-[var(--card-bg)] rounded-lg overflow-hidden shadow-lg border border-[var(--border)] hover:border-[var(--primary)] transition-all duration-300">
        <div className="relative h-48 overflow-hidden">
          <img
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={image}
            alt={title}
            onError={handleImageError}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <button
              onClick={handleCategoryClick}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-white/90 text-gray-800 hover:bg-white transition-colors cursor-pointer"
            >
              <CategoryIcon category={category} className="w-3 h-3" />
              {category}
            </button>
          </div>
        </div>
        <div className="p-4">
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.slice(0, 2).map((tag) => (
                <button
                  key={tag.id}
                  onClick={(e) => handleTagClick(e, tag.slug)}
                  className="inline-block px-2 py-0.5 text-xs rounded-full bg-[var(--background)] text-[var(--text-secondary)] hover:bg-[var(--primary)] hover:text-white transition-colors cursor-pointer"
                >
                  {tag.name}
                </button>
              ))}
              {tags.length > 2 && (
                <span className="text-xs text-[var(--text-secondary)]">+{tags.length - 2}</span>
              )}
            </div>
          )}
          <h3 className="text-lg font-bold text-[var(--text-primary)] line-clamp-2 mb-2 group-hover:text-[var(--primary)] transition-colors">
            {title}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
            {description}
          </p>
          <div className="text-xs text-[var(--text-secondary)]">
            {formattedDate}
          </div>
        </div>
      </div>
    </Link>
  );
};

const AuthorProfile: FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const [author, setAuthor] = useState<AuthorProfileType | null>(null);
  const [posts, setPosts] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  const dateFormatPreference = currentUser?.date_format_preference || "relative";

  // Fetch author profile and posts
  const fetchAuthorData = useCallback(async (offset: number = 0, append: boolean = false) => {
    if (!username) return;
    
    if (offset === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await fetch(`/api/authors/${encodeURIComponent(username)}?limit=20&offset=${offset}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError("not_found");
        } else {
          setError("Failed to load author profile");
        }
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const data = await response.json();
      
      // Check if profile is private
      if (data.message === "This profile is private" || data.author?.is_profile_public === false) {
        setIsPrivate(true);
        setAuthor(data.author);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      setAuthor(data.author);
      setTotal(data.total);
      setHasMore(data.hasMore);
      offsetRef.current = offset + data.posts.length;

      const articles = assignLayoutAndGridClass(data.posts);
      if (append) {
        setPosts((prev) => [...prev, ...articles]);
      } else {
        setPosts(articles);
      }
    } catch (err) {
      console.error("Error fetching author:", err);
      setError("Failed to load author profile");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [username]);

  // Initial load
  useEffect(() => {
    offsetRef.current = 0;
    setPosts([]);
    setError(null);
    setIsPrivate(false);
    setAuthor(null);
    fetchAuthorData(0, false);
  }, [username, fetchAuthorData]);

  // Infinite scroll observer
  useEffect(() => {
    if (!observerRef.current || loading || loadingMore || !hasMore || isPrivate) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchAuthorData(offsetRef.current, true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, isPrivate, fetchAuthorData]);

  if (error === "not_found") {
    return <NotFound />;
  }

  if (isPrivate && author) {
    return (
      <>
        <SEO
          title={`@${author.username} - J²Adventures`}
          description="This profile is private."
        />
        <PrivateProfile username={author.username} avatarUrl={author.avatar_url} />
      </>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SkeletonGrid count={6} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-[var(--text-secondary)]">{error}</p>
        </div>
      </div>
    );
  }

  if (!author) {
    return <NotFound />;
  }

  const breadcrumbItems = [
    { label: "Authors", href: "/" },
    { label: `@${author.username}` },
  ];

  return (
    <>
      <SEO
        title={`@${author.username} - J²Adventures`}
        description={author.bio || `Check out adventures by @${author.username}`}
      />

      <div className="min-h-screen bg-[var(--background)] pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <Breadcrumbs items={breadcrumbItems} />

          {/* Author Header */}
          <div className="bg-[var(--card-bg)] shadow-xl border border-[var(--border)] rounded-2xl p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <ProfileAvatar
                avatarUrl={author.avatar_url}
                username={author.username}
                size="lg"
              />

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">
                  @{author.username}
                </h1>

                {/* Location */}
                {author.location && (
                  <div className="flex items-center justify-center md:justify-start gap-2 text-[var(--text-secondary)] mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{author.location}</span>
                  </div>
                )}

                {/* Bio */}
                {author.bio && (
                  <p className="text-[var(--text-secondary)] mb-4 max-w-2xl">
                    {author.bio}
                  </p>
                )}

                {/* Favorites */}
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  {author.favorite_category && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--background)] rounded-full text-sm">
                      <CategoryIcon category={author.favorite_category} className="w-4 h-4 text-[var(--primary)]" />
                      <span className="text-[var(--text-secondary)]">Loves</span>
                      <span className="text-[var(--text-primary)] font-medium">{author.favorite_category}</span>
                    </div>
                  )}
                  {author.favorite_destination && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--background)] rounded-full text-sm">
                      <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-[var(--text-secondary)]">Favorite:</span>
                      <span className="text-[var(--text-primary)] font-medium">{author.favorite_destination}</span>
                    </div>
                  )}
                </div>

                {/* Post count */}
                <div className="mt-4 text-sm text-[var(--text-secondary)]">
                  {total} {total === 1 ? "adventure" : "adventures"} shared
                </div>
              </div>
            </div>
          </div>

          {/* Posts Grid */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Adventures</h2>
            
            {posts.length === 0 ? (
              <NoResults username={author.username} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
                {posts.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    dateFormatPreference={dateFormatPreference}
                  />
                ))}
                
                {loadingMore && <LoadingSpinner />}
              </div>
            )}

            {/* Infinite scroll trigger */}
            {hasMore && !loadingMore && posts.length > 0 && (
              <div ref={observerRef} className="h-10" />
            )}

            {/* End of content message */}
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                <p className="text-sm">You've reached the end of @{author.username}'s adventures!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthorProfile;
