import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  FC,
  SyntheticEvent,
  CSSProperties,
} from "react";

// --- TYPE DEFINITIONS ---

// Defines the structure for a single article object
type Article = {
  image: string;
  category: string;
  title: string;
  description: string;
  date: string;
  type: "split-horizontal" | "split-vertical" | "hover";
  gridClass: string;
};

// Defines the structure for a theme's CSS variables
type Theme = {
  [key: string]: string;
};

// Creates a union type of all available theme names
type ThemeName =
  | "midnightGarden"
  | "daylightGarden"
  | "enchantedForest"
  | "daylitForest";

// --- THEME CONFIGURATION ---

const themes: Record<ThemeName, Theme> = {
  // --- Refined Dark Modes ---
  midnightGarden: {
    "--background": "#2C3E34", // Deep forest green
    "--text-primary": "#F1F1EE", // Brighter Creamy white
    "--text-secondary": "#B0A99F", // Lighter Muted cream
    "--card-bg": "#3A5045", // Slightly lighter dark green
    "--primary": "#94C794", // Saturated sea green
    "--primary-light": "#AED8AE", // Lighter sea green
    "--border": "#4D6A5A",
    "--spinner": "#94C794",
    "--text-shadow": "0 1px 3px rgba(0,0,0,0.3)",
  },
  enchantedForest: {
    "--background": "#1B4332", // Deep, rich green
    "--text-primary": "#ECF9EE", // Brighter Minty cream
    "--text-secondary": "#A9C0A9", // Lighter mossy green-gray
    "--card-bg": "#2D6A4F", // Lighter deep green
    "--primary": "#9370DB", // Medium Purple (more mystical)
    "--primary-light": "#B19CD9", // Light Pastel Purple
    "--border": "#40916C",
    "--spinner": "#9370DB",
    "--text-shadow": "0 1px 3px rgba(0,0,0,0.4)",
  },

  daylightGarden: {
    "--background": "linear-gradient(to bottom, #E0E7D9, #C8D1C3)",
    "--text-primary": "#222B26",
    "--text-secondary": "#4A5D54", // Kept enhanced for better contrast
    "--text-highlight": "linear-gradient(to right, #4A5D54, #36443C)", // Kept gradient
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
    "--text-secondary": "#2A5240", // Kept enhanced for better contrast
    "--text-highlight": "linear-gradient(to right, #2A5240, #1B382B)", // Kept gradient
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

// --- MOCK DATA ---

const allArticles: Article[] = [
  {
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    category: "Places to Stay",
    title: "The Best Hotels and Resorts in Europe",
    description:
      "Explore Europe's finest accommodations, from the sun-drenched shores of the Amalfi Coast to the historic elegance of Paris.",
    date: "2025-10-10",
    type: "split-horizontal",
    gridClass: "sm:col-span-2",
  },
  {
    image:
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    category: "Coastal Escapes",
    title: "Idyllic Beachfront Properties",
    description:
      "Wake up to the sound of waves in these stunning seaside homes.",
    date: "2025-07-30",
    type: "hover",
    gridClass: "sm:col-span-1",
  },
  {
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    category: "City Breaks",
    title: "The Best Hotels in Budapest",
    description:
      "Budapest has been rejuvenated in recent years, and its hotel scene has taken the place of substance.",
    date: "2025-09-05",
    type: "split-vertical",
    gridClass: "",
  },
  {
    image:
      "https://images.unsplash.com/photo-1542314831-068cd1dbb5eb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    category: "Luxury Living",
    title: "Top 5 Villas with a View",
    description:
      "Experience opulence with these villas that offer breathtaking panoramas.",
    date: "2025-09-01",
    type: "split-vertical",
    gridClass: "",
  },
  {
    image:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1325&q=80",
    category: "Wellness",
    title: "Best Spa Retreats in Asia",
    description:
      "Recharge your body and mind at these serene wellness centers.",
    date: "2025-08-25",
    type: "hover",
    gridClass: "sm:col-span-2",
  },
  {
    image:
      "https://images.unsplash.com/photo-1445019980597-93e0901b8905?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1471&q=80",
    category: "Design Hotels",
    title: "Architectural Marvels You Can Stay In",
    description:
      "Stay in a work of art. These hotels are as beautiful as the cities they inhabit.",
    date: "2025-08-12",
    type: "split-vertical",
    gridClass: "",
  },
  {
    image:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    category: "Desert Getaways",
    title: "Oasis Resorts of the Sahara",
    description: "Find serenity among the dunes in these hidden gems.",
    date: "2025-05-20",
    type: "split-vertical",
    gridClass: "",
  },
  {
    image:
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    category: "Tropical Paradise",
    title: "Overwater Bungalows in the Maldives",
    description: "Crystal clear waters and ultimate relaxation await.",
    date: "2025-04-15",
    type: "split-horizontal",
    gridClass: "sm:col-span-2",
  },
  {
    image:
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    category: "Family Fun",
    title: "All-Inclusive Family Resorts",
    description: "Adventures for all ages, with everything taken care of.",
    date: "2025-03-10",
    type: "hover",
    gridClass: "sm:col-span-1",
  },
];

// --- HELPER COMPONENTS ---

const SearchIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-[var(--text-secondary)]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

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
      Try adjusting your search term.
    </p>
  </div>
);

// --- UTILITY FUNCTIONS ---

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

// --- REACT COMPONENTS ---

interface ArticleCardProps {
  article: Article;
}

const ArticleCard: FC<ArticleCardProps> = ({ article }) => {
  const { image, category, title, date, description, type, gridClass } =
    article;
  const formattedDate = formatDateToSeasonYear(date);

  // Handles broken image links
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

  // Default: "split-vertical"
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
  const articlesPerPage = 6;
  const [searchTerm, setSearchTerm] = useState("");
  const [displayedArticles, setDisplayedArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<ThemeName>("daylightGarden");

  // Memoize filtered articles to avoid recalculating on every render
  const filteredArticles = useMemo(
    () =>
      allArticles.filter(
        (article) =>
          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.category.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [searchTerm],
  );

  // Effect to reset articles when the search term changes
  useEffect(() => {
    setDisplayedArticles(filteredArticles.slice(0, articlesPerPage));
    setHasMore(filteredArticles.length > articlesPerPage);
  }, [filteredArticles]);

  const loadMoreArticles = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setTimeout(() => {
      const currentLength = displayedArticles.length;
      const nextArticles = filteredArticles.slice(
        currentLength,
        currentLength + articlesPerPage,
      );

      setDisplayedArticles((prev) => [...prev, ...nextArticles]);
      setHasMore(currentLength + nextArticles.length < filteredArticles.length);
      setIsLoading(false);
    }, 1000); // Simulate network delay
  }, [isLoading, hasMore, displayedArticles.length, filteredArticles]);

  // Effect for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      // Load more when user is 200px from the bottom
      if (
        window.innerHeight + document.documentElement.scrollTop <
        document.documentElement.offsetHeight - 200
      )
        return;
      loadMoreArticles();
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMoreArticles]);

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
          }
          h1, h3.font-bold {
            text-shadow: var(--text-shadow, none);
          }
        `}
      </style>
      <div
        style={
          {
            "--background": themes[currentTheme]["--background"],
            ...themes[currentTheme],
          } as CSSProperties
        }
        className="min-h-screen transition-colors duration-300"
      >
        <div
          style={{ background: "var(--background)" }}
          className="min-h-screen"
        >
          <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-6 sm:gap-4">
              <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] flex items-center">
                J<sup className="text-2xl sm:text-3xl -top-2 sm:-top-3">2</sup>{" "}
                Adventures
              </h1>
              <div className="flex items-center gap-4 flex-wrap justify-center">
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {(Object.keys(themes) as ThemeName[]).map((name) => (
                    <button
                      key={name}
                      onClick={() => setCurrentTheme(name)}
                      className={`w-6 h-6 rounded-full capitalize text-xs transition-all ${
                        currentTheme === name
                          ? "ring-2 ring-offset-2 ring-[var(--primary)]"
                          : ""
                      }`}
                      style={{
                        background: themes[name]["--background"],
                        border: `2px solid ${themes[name]["--primary"]}`,
                      }}
                      title={name.replace(/([A-Z])/g, " $1").trim()} // Add spaces for readability
                    />
                  ))}
                </div>
                <div className="relative w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 pl-10 pr-4 py-2 border border-[var(--border)] rounded-full text-sm bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--text-secondary)]"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon />
                  </div>
                </div>
              </div>
            </header>

            <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayedArticles.length > 0 ? (
                displayedArticles.map((article) => (
                  <ArticleCard key={article.title} article={article} />
                ))
              ) : !isLoading ? (
                <NoResults />
              ) : null}
              {isLoading && <LoadingSpinner />}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
