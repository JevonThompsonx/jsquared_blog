export const dynamic = "force-dynamic";

import Link from "next/link";

import { HomeFeed } from "@/components/blog/home-feed";
import { ScrollToStories } from "@/components/blog/scroll-to-stories";
import { SiteHeader } from "@/components/layout/site-header";
import { listPublishedPosts } from "@/server/queries/posts";

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
      kicker: "Winter field notes",
      title: "J²Adventures",
      subtitle: "Snowy pull-offs, quiet trails, and the little rituals that make a winter road day feel worth remembering.",
      note: "Right now: frosted trailheads, thermos coffee, and the kind of camps that earn their sunrise.",
    };
  }
  // Spring (Mar-May)
  if (month <= 4) {
    return {
      backgroundImage: "url('https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1920&auto=format&fit=crop')",
      kicker: "Seasonal dispatch",
      title: "J²Adventures",
      subtitle: "Travel stories, camp notes, and map-pin moments from the road, the trail, and everywhere in between.",
      note: "Right now: soft ground, loud birds, and the first camps of the year that make every bin in the van smell like pine.",
    };
  }
  // Summer (Jun-Aug)
  if (month <= 7) {
    return {
      backgroundImage: "url('https://images.unsplash.com/photo-1682686578842-00ba49b0a71a?q=80&w=1920&auto=format&fit=crop')",
      kicker: "Summer field notes",
      title: "J²Adventures",
      subtitle: "Peak-season wandering with more daylight, more detours, and more reasons to stay outside a little longer.",
      note: "Right now: lake swims after long hikes, late dinners at camp, and an unreasonable number of scenic pull-offs.",
    };
  }
  // Fall (Sep-Nov)
  return {
    backgroundImage: "url('https://images.unsplash.com/photo-1507371341162-763b5e419408?q=80&w=1920&auto=format&fit=crop')",
    kicker: "Fall field notes",
    title: "J²Adventures",
    subtitle: "Crisp camps, changing leaves, and the kind of shoulder-season travel that turns small stops into favorite memories.",
    note: "Right now: campfire layers, roadside cider, and the steady temptation to call every extra mile 'just one more scenic detour.'",
  };
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ search?: string }> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const search = resolvedSearchParams?.search ?? "";
  const posts = await listPublishedPosts(20, 0, search);

  if (search) {
    return (
      <main style={{ background: "var(--background)" }}>
        <SiteHeader />
        <div className="container mx-auto px-4 pb-2 pt-28 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Search results</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Results for &ldquo;{search}&rdquo;
          </h1>
        </div>
        <HomeFeed key={`feed:${search.trim().toLowerCase()}`} initialPosts={posts} initialSearch={search} />
      </main>
    );
  }

  const seasonalHero = getSeasonalHero();

  return (
    <main style={{ background: "var(--background)" }}>
      <SiteHeader />

        <div
          className="landing-page transition-[background-image] duration-1000"
          style={{
          backgroundImage: seasonalHero.backgroundImage,
          }}
        >
          <div className="hero-shell">
            <div className="welcome-text backdrop-blur-sm">
              <span className="hero-kicker">{seasonalHero.kicker}</span>
              <h1 className="landing-title drop-shadow-lg">{seasonalHero.title}</h1>
              <p className="landing-subtitle drop-shadow-md">{seasonalHero.subtitle}</p>
              <p className="hero-note">{seasonalHero.note}</p>
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
