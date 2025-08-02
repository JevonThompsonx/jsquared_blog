// client/src/components/Home.tsx

import {
  useState,
  useEffect,
  useMemo,
  FC,
  SyntheticEvent,
  CSSProperties,
} from "react";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext"; // <-- IMPORT AUTH HOOK

// --- TYPE DEFINITIONS ---

type PostType = "split-horizontal" | "split-vertical" | "hover";

// This type should match what your API returns from the 'posts' table
type Post = {
  id: number;
  created_at: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  type: PostType;
  grid_class: string | null;
  author_id: string;
};

// This type can remain for your display components
type Article = {
  image: string;
  category: string;
  title: string;
  description: string;
  date: string;
  type: "split-horizontal" | "split-vertical" | "hover";
  gridClass: string;
};

// ... (Theme configuration remains the same)
type Theme = { [key: string]: string };
import { ThemeName } from "../../../shared/src/types";
const themes: Record<ThemeName, Theme> = {
  midnightGarden: {
    "--background": "#2C3E34",
    "--text-primary": "#F1F1EE",
    "--text-secondary": "#B0A99F",
    "--card-bg": "#3A5045",
    "--primary": "#94C794",
    "--primary-light": "#AED8AE",
    "--border": "#4D6A5A",
    "--spinner": "#94C794",
    "--text-shadow": "0 1px 3px rgba(0,0,0,0.3)",
  },
  enchantedForest: {
    "--background": "#1B4332",
    "--text-primary": "#ECF9EE",
    "--text-secondary": "#A9C0A9",
    "--card-bg": "#2D6A4F",
    "--primary": "#9370DB",
    "--primary-light": "#B19CD9",
    "--border": "#40916C",
    "--spinner": "#9370DB",
    "--text-shadow": "0 1px 3px rgba(0,0,0,0.4)",
  },
  daylightGarden: {
    "--background": "linear-gradient(to bottom, #E0E7D9, #C8D1C3)",
    "--text-primary": "#222B26",
    "--text-secondary": "#4A5D54",
    "--text-highlight": "linear-gradient(to right, #4A5D54, #36443C)",
    "--card-bg": "#ffffff",
    "--primary": "#6A8E23",
    "--primary-light": "#94B74B",
    "--border": "#d4e6d4",
    "--spinner": "#6A8E23",
    "--text-shadow": "none",
    "--selection-bg": "#6A8E23",
    "--selection-text": "#ffffff",
  },
  daylitForest: {
    "--background": "linear-gradient(to bottom, #F5F5DC, #C1D5C0)",
    "--text-primary": "#102A1E",
    "--text-secondary": "#2A5240",
    "--text-highlight": "linear-gradient(to right, #2A5240, #1B382B)",
    "--card-bg": "#ffffff",
    "--primary": "#52B788",
    "--primary-light": "#95D5B2",
    "--border": "#B7CEB7",
    "--spinner": "#52B788",
    "--text-shadow": "none",
    "--selection-bg": "#52B788",
    "--selection-text": "#ffffff",
  },
};

// --- HELPER COMPONENTS (LoadingSpinner, NoResults) remain the same ---
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

// ... (formatDateToSeasonYear and ArticleCard remain the same)
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
  const { image, category, title, date, description, type, gridClass } =
    article;
  const formattedDate = formatDateToSeasonYear(date);
  const handleImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src =
      "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found";
  };
  if (type === "hover") {
    return (
      <div
        className={`group relative rounded-lg overflow-hidden shadow-lg h-full ${gridClass}`}
      >
        <img
          className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
          src={image}
          alt={title}
          onError={handleImageError}
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
    );
  }
  if (type === "split-horizontal") {
    return (
      <div
        className={`rounded-lg overflow-hidden shadow-lg bg-[var(--card-bg)] flex flex-col md:flex-row ${gridClass}`}
      >
        <img
          className="h-56 md:h-full w-full md:w-1/2 object-cover"
          src={image}
          alt={title}
          onError={handleImageError}
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
    );
  }
  return (
    <div
      className={`rounded-lg overflow-hidden shadow-lg bg-[var(--card-bg)] flex flex-col ${gridClass}`}
    >
      <img
        className="h-48 w-full object-cover"
        src={image}
        alt={title}
        onError={handleImageError}
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
  );
};

// --- MAIN PAGE COMPONENT ---
export default function Home() {
  const { user } = useAuth(); // Get user from auth context
  const [allPosts, setAllPosts] = useState<Post[]>([]); // To store data from API
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [currentTheme, setCurrentTheme] = useState<ThemeName>("daylightGarden");

  // Fetch data from the backend
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
        // Optionally set an error state here to show in the UI
      }
      setIsLoading(false);
    };

    fetchPosts();
  }, []); // Empty dependency array means this runs once on mount

  // Memoize filtered articles to avoid recalculating on every render
  const displayedArticles = useMemo<Article[]>(() => {
    const filtered = allPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.category &&
          post.category.toLowerCase().includes(searchTerm.toLowerCase())),
    );

    // Map the filtered API data to the Article format your components expect
    return filtered.map((post) => ({
      image:
        post.image_url ||
        "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found",
      category: post.category || "General",
      title: post.title,
      description: post.description || "",
      date: post.created_at,
      type: post.type || "split-vertical",
      gridClass: post.grid_class || "",
    }));
  }, [allPosts, searchTerm]);

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
          body { font-family: 'Inter', sans-serif; }
          h1, h3.font-bold { text-shadow: var(--text-shadow, none); }
        `}
      </style>
      <div
        style={themes[currentTheme] as CSSProperties}
        className="min-h-screen transition-colors duration-300"
      >
        <div
          style={{ background: `var(--background)` }}
          className="min-h-screen"
        >
          <Navbar
            currentTheme={currentTheme}
            setCurrentTheme={setCurrentTheme}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
          {/* Welcome message for logged-in user */}
          {user && (
            <div className="container mx-auto p-4 text-center text-[var(--text-secondary)]">
              Welcome back, {user.email}!
            </div>
          )}

          <main className="container mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              <LoadingSpinner />
            ) : displayedArticles.length > 0 ? (
              displayedArticles.map((article) => (
                <ArticleCard key={article.title} article={article} />
              ))
            ) : (
              <NoResults />
            )}
          </main>
        </div>
      </div>
    </>
  );
}
