export const dynamic = "force-dynamic";

import { HomeFeed } from "@/components/blog/home-feed";
import { SiteHeader } from "@/components/layout/site-header";
import { listPublishedPosts } from "@/server/queries/posts";

export default async function HomePage() {
  const posts = await listPublishedPosts(20);

  return (
    <main style={{ background: "var(--background)" }}>
      <SiteHeader />

      <div
        className="landing-page"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1682686578842-00ba49b0a71a?q=60&w=1075&fm=webp&fit=crop&ixlib=rb-4.1.0')",
        }}
      >
        <div className="welcome-text backdrop-blur-sm">
          <h1 className="landing-title drop-shadow-lg">J²Adventures</h1>
          <p className="landing-subtitle drop-shadow-md">Exploring the world, one adventure at a time.</p>
          <a
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:text-white"
            href="/feed.xml"
            rel="noopener noreferrer"
            target="_blank"
            title="Subscribe to RSS Feed"
          >
            RSS Feed
          </a>
        </div>
        <div className="scroll-indicator">
          <div className="arrow-down"></div>
        </div>
      </div>

      <div className="main-content main-content-visible">
        <HomeFeed initialPosts={posts} />
      </div>
    </main>
  );
}
