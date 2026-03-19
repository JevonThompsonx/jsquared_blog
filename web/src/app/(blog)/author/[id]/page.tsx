import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { countCommentsByUserId, listCommentsByUserId } from "@/server/dal/comments";
import { getPublicAuthorProfileById } from "@/server/dal/profiles";
import { getPostHref } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Avatar preset rendering (server-side)
// ---------------------------------------------------------------------------

type AvatarPreset = { id: string; bg: string; path: string };

const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "j2:mountain", bg: "#7c9557", path: "M12 3L2 21h20L12 3zm0 4.5l6.2 10.5H5.8L12 7.5z" },
  { id: "j2:compass", bg: "#557468", path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-9.5L9 16l5.5-2.5L16 8l-5.5 2.5z" },
  { id: "j2:tent", bg: "#8b7355", path: "M12 2L3 18h18L12 2zm0 3.8L18.2 16H5.8L12 5.8zM10 16v4h4v-4" },
  { id: "j2:camera", bg: "#6b7a8d", path: "M20 5h-3.2L15 3H9L7.2 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm-8 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" },
  { id: "j2:wave", bg: "#4a8fa8", path: "M2 12c1.5-3 3-4.5 4.5-4.5S9 9 10.5 9 13.5 7.5 15 7.5 18 9 19.5 9 21 7.5 22 7.5M2 17c1.5-3 3-4.5 4.5-4.5S9 14 10.5 14 13.5 12.5 15 12.5 18 14 19.5 14 21 12.5 22 12.5" },
  { id: "j2:bike", bg: "#5c8a5c", path: "M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm14 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 7l2 5H7l3-5h2zm0 0l2 5H19l-3-5h-4z" },
  { id: "j2:map", bg: "#a0785a", path: "M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3zm0 2.3L15 9v10.4L9 16.7V6.3zM7 6.7v10L3 18.7V7.3l4-2zm10 0l4 2v11.4l-4 1.6V6.7z" },
  { id: "j2:sun", bg: "#c8843a", path: "M12 3v2M12 19v2M3 12H1M23 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
];

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function ProfileAvatar({ avatarUrl, displayName, size }: { avatarUrl: string | null; displayName: string; size: number }) {
  const preset = avatarUrl?.startsWith("j2:") ? AVATAR_PRESETS.find((p) => p.id === avatarUrl) : null;
  const initials = getInitials(displayName);

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  } satisfies React.CSSProperties;

  if (preset) {
    return (
      <div style={{ ...baseStyle, background: preset.bg }}>
        <svg fill="none" height={size * 0.55} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width={size * 0.55}>
          <path d={preset.path} />
        </svg>
      </div>
    );
  }

  if (avatarUrl && !avatarUrl.startsWith("j2:")) {
    return <Image alt={displayName} height={size} src={avatarUrl} style={{ ...baseStyle, objectFit: "cover" }} width={size} />;
  }

  return (
    <div style={{ ...baseStyle, background: "var(--primary)", fontSize: size * 0.35, fontWeight: 700, color: "white" }}>
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPublicAuthorProfileById(id);
  if (!profile) return { title: "Author not found" };
  return {
    title: `${profile.displayName} — J²Adventures`,
    description: profile.bio ?? `${profile.displayName}'s activity on J²Adventures.`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function formatCommentDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AuthorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [profile, recentComments, totalComments] = await Promise.all([
    getPublicAuthorProfileById(id),
    listCommentsByUserId(id, 20),
    countCommentsByUserId(id),
  ]);

  if (!profile) notFound();

  const topLevelComments = recentComments.filter((c) => c.parentId === null);
  const replyCount = recentComments.filter((c) => c.parentId !== null).length;
  const totalLikes = recentComments.reduce((sum, c) => sum + c.likeCount, 0);

  return (
    <main id="main-content" className="min-h-screen pb-20 pt-20 sm:pt-24" style={{ background: "var(--background)" }} tabIndex={-1}>
      <SiteHeader />

      <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

        {/* Profile card */}
        <section className="mt-10 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-lg">
          {/* Accent band */}
          <div className="h-24 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] sm:h-32" />

          <div className="px-6 pb-8 sm:px-8">
            {/* Avatar — overlaps the band */}
            <div className="-mt-10 mb-4 sm:-mt-12">
              <div className="inline-block rounded-full border-4 border-[var(--card-bg)] shadow-lg">
                <ProfileAvatar avatarUrl={profile.avatarUrl} displayName={profile.displayName} size={80} />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{profile.displayName}</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Member since {formatDate(profile.memberSince)}</p>

            {profile.bio ? (
              <p className="mt-4 max-w-prose leading-relaxed text-[var(--text-secondary)]">{profile.bio}</p>
            ) : null}

            {/* Stats */}
            <div className="mt-6 flex flex-wrap gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{totalComments}</p>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                  {totalComments === 1 ? "Comment" : "Comments"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{totalLikes}</p>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">Likes received</p>
              </div>
            </div>
          </div>
        </section>

        {/* Activity feed */}
        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Activity</p>
          <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">Recent comments</h2>

          {recentComments.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center text-[var(--text-secondary)]">
              No comments yet — check back later.
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {recentComments.map((comment) => (
                <article
                  key={comment.id}
                  className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm"
                >
                  {/* Post link */}
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {comment.parentId ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
                        ↩ Reply
                      </span>
                    ) : null}
                    <Link
                      className="text-xs font-semibold text-[var(--accent)] hover:underline"
                      href={getPostHref(comment.post)}
                    >
                      {comment.post.title}
                    </Link>
                    <span className="text-xs text-[var(--text-secondary)]">{formatCommentDate(comment.createdAt)}</span>
                  </div>

                  {/* Comment text */}
                  <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                    {truncate(comment.content, 280)}
                  </p>

                  {/* Likes */}
                  {comment.likeCount > 0 ? (
                    <p className="mt-3 text-xs text-[var(--text-secondary)]">
                      ♥ {comment.likeCount} {comment.likeCount === 1 ? "like" : "likes"}
                    </p>
                  ) : null}
                </article>
              ))}

              {totalComments > 20 ? (
                <p className="pt-2 text-center text-sm text-[var(--text-secondary)]">
                  Showing 20 most recent of {totalComments} comments
                </p>
              ) : null}
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="mt-10 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--accent-soft)] to-transparent p-8 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Keep exploring</p>
          <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">Read the adventures</h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">Browse the latest stories from J²Adventures.</p>
          <Link
            className="btn-primary mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-bold shadow-md transition-transform hover:-translate-y-0.5"
            href="/"
          >
            Browse stories →
          </Link>
        </section>

      </div>
    </main>
  );
}
