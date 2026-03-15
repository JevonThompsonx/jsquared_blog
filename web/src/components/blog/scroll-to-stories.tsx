"use client";

export function ScrollToStories() {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    document.getElementById("stories")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <a className="hero-secondary-link" href="#stories" onClick={handleClick}>
      Browse stories ↓
    </a>
  );
}
