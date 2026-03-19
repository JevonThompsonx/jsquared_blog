export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";

import { HomeFeed } from "@/components/blog/home-feed";
import { SearchInput } from "@/components/blog/search-input";
import { ScrollToStories } from "@/components/blog/scroll-to-stories";
import { SiteHeader } from "@/components/layout/site-header";
import { listPublishedPosts } from "@/server/queries/posts";

const SEARCH_SUGGESTIONS = ["Sierra", "Winter", "Oregon", "Road trip"];

type SeasonalHero = {
  backgroundImage: string;
  kicker: string;
  title: string;
  subtitle: string;
  note: string;
};

function getSeasonalHero(): SeasonalHero {
  const month = new Date().getMonth();
  // Winter (Dec-Feb)
  if (month === 11 || month <= 1) {
    return {
      backgroundImage: "url('https://images.unsplash.com/photo-1542601098-8fc114e148e2?q=80&w=1920&auto=format&fit=crop')",
      kicker: "",
      title: "J²Adventures",
      subtitle: "",
      note: "",
    };
  }
  // Spring (Mar-May)
  if (month <= 4) {
    return {
      backgroundImage: "url('https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1920&auto=format&fit=crop')",
      kicker: "",
      title: "J²Adventures",
      subtitle: "",
      note: "",
    };
  }
  // Summer (Jun-Aug)
  if (month <= 7) {
    return {
      backgroundImage: "url('https://images.unsplash.com/photo-1682686578842-00ba49b0a71a?q=80&w=1920&auto=format&fit=crop')",
      kicker: "",
      title: "J²Adventures",
      subtitle: "",
      note: "",
    };
  }
  // Fall (Sep-Nov)
  return {
    backgroundImage: "url('https://images.unsplash.com/photo-1507371341162-763b5e419408?q=80&w=1920&auto=format&fit=crop')",
    kicker: "",
    title: "J²Adventures",
    subtitle: "",
    note: "",
  };
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ search?: string }> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const search = resolvedSearchParams?.search ?? "";
  const posts = await listPublishedPosts(20, 0, search);

  if (search) {
    const hasMatches = posts.length > 0;

    return (
      <main id="main-content" style={{ background: "var(--background)" }} tabIndex={-1}>
        <SiteHeader />
        <section className="container mx-auto px-4 pb-2 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-[2rem] border border-[var(--border)] bg-[var(--card-bg)]/80 p-6 shadow-[var(--shadow)] backdrop-blur-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Search results</p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
              {hasMatches ? `Results for “${search}”` : `No results for “${search}”`}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
              {hasMatches
                ? "Refine the phrase below or jump into a nearby trail of stories."
                : "Try a place name, a season, or a road-trip keyword to widen the trail."}
            </p>
            <div className="mt-6">
              <SearchInput
                autoFocus
                initialValue={search}
                key={`search-input:${search.trim().toLowerCase()}`}
                placeholder="Search stories, places, seasons, and tags…"
                showSuggestions={!hasMatches}
                suggestions={SEARCH_SUGGESTIONS}
              />
            </div>
          </div>
        </section>
        <HomeFeed key={`feed:${search.trim().toLowerCase()}`} initialPosts={posts} initialSearch={search} />
      </main>
    );
  }

  const seasonalHero = getSeasonalHero();

  return (
    <main id="main-content" style={{ background: "var(--background)" }} tabIndex={-1}>
      <SiteHeader />

        <div className="landing-page relative overflow-hidden">
          <Image
            alt="Hero background"
            className="object-cover transition-opacity duration-1000"
            fill
            priority
            src={seasonalHero.backgroundImage.replace(/^url\('(.+)'\)$/, "$1")}
            sizes="100vw"
          />
          <div className="hero-shell relative z-10">
            <div className="welcome-text backdrop-blur-sm">
              {seasonalHero.kicker && <span className="hero-kicker">{seasonalHero.kicker}</span>}
              <h1 className="landing-title drop-shadow-lg">{seasonalHero.title}</h1>
              {seasonalHero.subtitle && <p className="landing-subtitle drop-shadow-md">{seasonalHero.subtitle}</p>}
              {seasonalHero.note && <p className="hero-note">{seasonalHero.note}</p>}
              <div className="hero-actions">
                <ScrollToStories />
                <Link className="hero-secondary-link" href="/map">
                  Explore the map
                </Link>
                <a
                  className="hero-secondary-link"
                  href="/feed.xml"
                  rel="noopener noreferrer"
                  target="_blank"
                  title="Subscribe to RSS Feed"
                >
                  RSS Feed
                </a>
              </div>
            </div>
          </div>
          <div className="scroll-indicator">
            <div className="arrow-down"></div>
          </div>
        </div>

      <div className="main-content main-content-visible" id="stories">
        <div className="container mx-auto px-4 pt-8 pb-2 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Latest adventures</p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">Stories from the trail</h2>
        </div>
        <HomeFeed key="feed:home" initialPosts={posts} initialSearch="" />
      </div>
    </main>
  );
}
