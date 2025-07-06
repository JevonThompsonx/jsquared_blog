import React, { useState, useEffect, useCallback } from "react";

// --- THEME CONFIGURATION ---
const themes = {
  default: {
    "--background": "#f3f4f6", // Tailwind gray-100
    "--text-primary": "#1f2937", // Tailwind gray-800
    "--text-secondary": "#4b5563", // Tailwind gray-600
    "--card-bg": "#ffffff", // Tailwind white
    "--primary": "#6366f1", // Tailwind indigo-500
    "--primary-light": "#a5b4fc", // Tailwind indigo-300
    "--border": "#d1d5db", // Tailwind gray-300
    "--spinner": "#6366f1", // Tailwind indigo-500
  },
  dark: {
    "--background": "#111827", // Tailwind gray-900
    "--text-primary": "#f9fafb", // Tailwind gray-50
    "--text-secondary": "#9ca3af", // Tailwind gray-400
    "--card-bg": "#1f2937", // Tailwind gray-800
    "--primary": "#818cf8", // Tailwind indigo-400
    "--primary-light": "#a78bfa", // Tailwind violet-400
    "--border": "#374151", // Tailwind gray-700
    "--spinner": "#818cf8", // Tailwind indigo-400
  },
  forest: {
    "--background": "#f0fdf4", // Tailwind green-50
    "--text-primary": "#14532d", // Tailwind green-900
    "--text-secondary": "#16a34a", // Tailwind green-600
    "--card-bg": "#ffffff", // Tailwind white
    "--primary": "#22c55e", // Tailwind green-500
    "--primary-light": "#86efac", // Tailwind green-300
    "--border": "#bbf7d0", // Tailwind green-200
    "--spinner": "#22c55e", // Tailwind green-500
  },
  ocean: {
    "--background": "#f0f9ff", // Tailwind sky-50
    "--text-primary": "#082f49", // Tailwind cyan-900
    "--text-secondary": "#0ea5e9", // Tailwind sky-500
    "--card-bg": "#ffffff", // Tailwind white
    "--primary": "#38bdf8", // Tailwind sky-400
    "--primary-light": "#7dd3fc", // Tailwind sky-300
    "--border": "#bae6fd", // Tailwind sky-200
    "--spinner": "#0ea5e9", // Tailwind sky-500
  },
};

// --- HELPER COMPONENTS ---

const SearchIcon = () => (
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

const LoadingSpinner = () => (
  <div className="flex justify-center items-center col-span-full py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--spinner)]"></div>
  </div>
);

// --- UTILITY FUNCTIONS ---

const formatDateToSeasonYear = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const month = date.getMonth();
  const year = date.getFullYear();
  let season = "";
  if (month >= 2 && month <= 4) season = "Spring";
  else if (month >= 5 && month <= 7) season = "Summer";
  else if (month >= 8 && month <= 10) season = "Fall";
  else season = "Winter";
  return `${season} ${year}`;
};

// --- MOCK DATA ---
const allArticles = [
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

// --- REACT COMPONENTS ---

const ArticleCard = ({ article }) => {
  const { image, category, title, date, description, type, gridClass } =
    article;
  const formattedDate = formatDateToSeasonYear(date);

  if (type === "hover") {
    return (
      <div
        className={`group relative rounded-lg overflow-hidden shadow-lg h-full ${gridClass}`}
      >
        <img
          className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
          src={image}
          alt={title}
          onError={(e) => {
            e.currentTarget.src =
              "https://placehold.co/600x800/EEE/31343C?text=Image+Not+Found";
          }}
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
          onError={(e) => {
            e.currentTarget.src =
              "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found";
          }}
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
        onError={(e) => {
          e.currentTarget.src =
            "https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found";
        }}
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

export default function Home() {
  const articlesPerPage = 6;
  const [displayedArticles, setDisplayedArticles] = useState(
    allArticles.slice(0, articlesPerPage),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentTheme, setCurrentTheme] = useState("default");

  const loadMoreArticles = useCallback(() => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    setTimeout(() => {
      const currentLength = displayedArticles.length;
      const nextArticles = allArticles.slice(
        currentLength,
        currentLength + articlesPerPage,
      );
      if (nextArticles.length > 0) {
        setDisplayedArticles((prev) => [...prev, ...nextArticles]);
      } else {
        setHasMore(false);
      }
      setIsLoading(false);
    }, 1000);
  }, [isLoading, hasMore, displayedArticles.length]);

  useEffect(() => {
    const handleScroll = () => {
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
    <div
      style={themes[currentTheme]}
      className="bg-[var(--background)] min-h-screen font-sans transition-colors duration-300"
    >
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-6 sm:gap-4">
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] flex items-center">
            J<sup className="text-2xl sm:text-3xl -top-2 sm:-top-3">2</sup>
            Adventures
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {Object.keys(themes).map((name) => (
                <button
                  key={name}
                  onClick={() => setCurrentTheme(name)}
                  className={`w-6 h-6 rounded-full capitalize text-xs transition-all ${currentTheme === name ? "ring-2 ring-offset-2 ring-[var(--primary)]" : ""}`}
                  style={{
                    backgroundColor: themes[name]["--card-bg"],
                    border: `2px solid ${themes[name]["--primary"]}`,
                  }}
                  title={name}
                />
              ))}
            </div>
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search articles..."
                className="w-full sm:w-64 pl-10 pr-4 py-2 border border-[var(--border)] rounded-full text-sm bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--text-secondary)]"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedArticles.map((article, index) => (
            <ArticleCard key={index} article={article} />
          ))}
          {isLoading && <LoadingSpinner />}
        </main>
      </div>
    </div>
  );
}
