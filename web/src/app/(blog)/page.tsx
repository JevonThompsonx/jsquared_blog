export const dynamic = "force-dynamic";

import { HomeFeed } from "@/components/blog/home-feed";
import { SiteHeader } from "@/components/layout/site-header";
import { listPublishedPosts } from "@/server/queries/posts";

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ search?: string }> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const search = resolvedSearchParams?.search ?? "";
  const posts = await listPublishedPosts(20, 0, search);

  return (
    <main style={{ background: "var(--background)" }}>
      <SiteHeader />

      <div
        className="landing-page"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1682686578842-00ba49b0a71a?q=60&w=1075&fm=webp&fit=crop&ixlib=rb-4.1.0')",
        }}
      >
        <div className="hero-shell">
          <div className="welcome-text backdrop-blur-sm">
            <span className="hero-kicker">Travel journal</span>
            <h1 className="landing-title drop-shadow-lg">J²Adventures</h1>
            <p className="landing-subtitle drop-shadow-md">Exploring the world, one adventure at a time.</p>
            <div className="hero-actions">
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

      <div className="main-content main-content-visible">
        <HomeFeed key={`feed:${search.trim().toLowerCase()}`} initialPosts={posts} initialSearch={search} />
      </div>
    </main>
  );
}
