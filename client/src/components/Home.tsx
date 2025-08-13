

import { useEffect, useMemo, FC, SyntheticEvent, useState, useRef } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeName, Post, Article } from "../../../shared/src/types";

const LoadingSpinner: FC = () => (
  <div className="flex justify-center items-center col-span-full py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--spinner)]"></div>
  </div>
);
const NoResults: FC = () => (
  <div className="col-span-full bg-[var(--card-bg)] shadow-md rounded-lg p-8 text-center">
    <h3 className="text-2xl font-bold text-[var(--text-primary)]">
      No Articles Found
    </h3>
    <p className="mt-2 text-[var(--text-secondary)]">
      Try adjusting your search term or check back later.
    </p>
  </div>
);

const assignLayoutAndGridClass = (posts: Post[]): Article[] => {
  return posts.map((post) => {
    let gridClass = "col-span-1 md:col-span-1";
    if (post.type === "horizontal") {
      gridClass = "col-span-1 md:col-span-2";
    }
    if (post.type === "horizontal") {
      gridClass += " lg:col-span-2 xl:col-span-2";
    } else {
      gridClass += " lg:col-span-1 xl:col-span-1";
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
  if (article.dynamicViewType === "hover") {
    return (
      <Link
        to={`/posts/${id}`}
        className={`${gridClass} ${isAnimating ? "transition-all duration-1000 ease-out transform scale-0 opacity-0" : "transition-all duration-1000 ease-out transform scale-100 opacity-100"}`}
      >
        <div
          className={`group relative rounded-lg overflow-hidden shadow-lg h-full`}
        >
          <img
            className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
            src={image}
            alt={title}
            onError={handleImageError}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 p-4 md:p-6">
            <div className="tracking-wide text-sm text-[var(--primary-light)] font-semibold">
              {category}
            </div>
            <h3 className="mt-1 text-xl md:text-2xl font-bold leading-tight text-white">
              {title}
            </h3>
            <div className="text-gray-300 text-xs md:text-sm mt-2">
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
  if (article.dynamicViewType === "horizontal") {
    return (
      <Link
        to={`/posts/${id}`}
        className={`${gridClass} ${isAnimating ? "transition-all duration-1000 ease-out transform scale-0 opacity-0" : "transition-all duration-1000 ease-out transform scale-100 opacity-100"}`}
      >
        <div
          className={`rounded-lg overflow-hidden shadow-lg bg-[var(--card-bg)] flex flex-col md:flex-row`}
        >
          <img
            className="h-64 md:h-auto w-full md:w-1/2 object-cover"
            src={image}
            alt={title}
            onError={handleImageError}
            loading="lazy"
          />
          <div className="p-4 md:p-6 flex flex-col justify-between">
            <div>
              <div className="tracking-wide text-sm text-[var(--primary)] font-semibold">
                {category}
              </div>
              <h3 className="mt-1 text-xl md:text-2xl font-bold leading-tight text-[var(--text-primary)]">
                {title}
              </h3>
              <p className="mt-2 text-[var(--text-secondary)]">{description}</p>
            </div>
            <div className="mt-4 text-sm text-[var(--text-secondary)]">
              {formattedDate}
            </div>
          </div>
        </div>
      </Link>
    );
  }
  return (
    <Link
      to={`/posts/${id}`}
      className={`${gridClass} ${isAnimating ? "transition-all duration-1000 ease-out transform scale-0 opacity-0" : "transition-all duration-1000 ease-out transform scale-100 opacity-100"}`}
    >
      <div
        className={`rounded-lg overflow-hidden shadow-lg bg-[var(--card-bg)] flex flex-col`}
      >
        <img
          className="h-56 w-full object-cover"
          src={image} // Directly use the image URL
          alt={title}
          onError={handleImageError}
          loading="lazy"
        />
        <div className="p-4 md:p-6 flex-grow flex flex-col">
          <div className="tracking-wide text-sm text-[var(--primary)] font-semibold">
            {category}
          </div>
          <h3 className="mt-1 font-bold text-xl leading-tight text-[var(--text-primary)]">
            {title}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)] flex-grow">
            {description}
          </p>
          {date && (
            <p className="mt-4 text-xs text-[var(--text-secondary)] self-start">
              {formattedDate}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default function Home() {
  const { user } = useAuth();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const { searchTerm } = useOutletContext<HomeProps>();

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/posts");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data: Post[] = await response.json();
        setAllPosts(data);
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      }
      setIsLoading(false);
      setIsAnimating(false);
    };

    fetchPosts();
  }, []);

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
    const layoutedAndFiltered = assignLayoutAndGridClass(allPosts).filter(
      (article) => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const seasonYear = formatDateToSeasonYear(article.date).toLowerCase();

        return (
          article.title.toLowerCase().includes(lowerCaseSearchTerm) ||
          (article.category &&
            article.category.toLowerCase().includes(lowerCaseSearchTerm)) ||
          seasonYear.includes(lowerCaseSearchTerm)
        );
      },
    );

    return layoutedAndFiltered;
  }, [allPosts, searchTerm]);

  return (
    <>
      <div
        className="landing-page"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1682686578842-00ba49b0a71a?q=80&w=1075&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`,
        }}
      >
        <div className="welcome-text">
          <h1 className="landing-title">Welcome to Our Blog</h1>
          <p className="landing-subtitle">
            A collection of our adventures and stories.
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
          <div className="container mx-auto p-4 text-center text-[var(--text-secondary)]">
            Welcome back, {user.email}!<br />
          </div>
        )}

        <main className="container mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 auto-rows-[minmax(250px,auto)]">
          {isLoading ? (
            <LoadingSpinner />
          ) : displayedArticles.length > 0 ? (
            displayedArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                isAnimating={isAnimating}
              />
            ))
          ) : (
            <NoResults />
          )}
        </main>
      </div>
    </>
  );
}
