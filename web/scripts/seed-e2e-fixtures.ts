/**
 * Seed stable admin E2E fixtures and persist their IDs for Playwright smoke tests.
 * Run: bun run seed:e2e
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { and, count, eq } from "drizzle-orm";

import { authAccounts, categories, comments, posts, profiles, users } from "../src/drizzle/schema";
import { getDb } from "../src/lib/db-core";
import { loadEnvironmentFiles } from "../src/lib/env-loader";

loadEnvironmentFiles();

const ENV_FILE_PATH = path.resolve(process.cwd(), ".env.test.local");
const FIXTURE_POST_ID = "e2e-admin-post-fixture";
const FIXTURE_POST_SLUG = "e2e-admin-fixture-post";
const FIXTURE_CATEGORY_ID = "category-road-trips";
const FIXTURE_AUTHOR_ID = "e2e-admin-author";
const FIXTURE_COMMENTER_ID = "e2e-commenter";
const FIXTURE_COMMENTER_ACCOUNT_ID = "e2e-commenter-supabase-account";
const FIXTURE_PARENT_COMMENT_ID = "e2e-comment-parent";
const FIXTURE_REPLY_COMMENT_ID = "e2e-comment-reply";

function readExistingEnvFile(): Map<string, string> {
  if (!existsSync(ENV_FILE_PATH)) {
    return new Map();
  }

  const lines = readFileSync(ENV_FILE_PATH, "utf8").split(/\r?\n/);
  const values = new Map<string, string>();

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1);
    values.set(key, value);
  }

  return values;
}

async function writeEnvValue(key: string, value: string): Promise<void> {
  const values = readExistingEnvFile();
  values.set(key, value);

  const lines = Array.from(values.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([entryKey, entryValue]) => `${entryKey}=${entryValue}`);

  await mkdir(path.dirname(ENV_FILE_PATH), { recursive: true });
  await writeFile(ENV_FILE_PATH, `${lines.join("\n")}\n`, "utf8");
}

async function ensureAdminAuthor(): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db
    .insert(users)
    .values({
      id: FIXTURE_AUTHOR_ID,
      primaryEmail: "e2e-admin@jsquaredadventures.test",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        primaryEmail: "e2e-admin@jsquaredadventures.test",
        role: "admin",
        updatedAt: now,
      },
    });

  await db
    .insert(profiles)
    .values({
      userId: FIXTURE_AUTHOR_ID,
      displayName: "E2E Admin",
      avatarUrl: null,
      bio: "Stable admin fixture author for Playwright smoke coverage.",
      themePreference: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        displayName: "E2E Admin",
        avatarUrl: null,
        bio: "Stable admin fixture author for Playwright smoke coverage.",
        updatedAt: now,
      },
    });
}

async function ensurePublicCommenter(): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db
    .insert(users)
    .values({
      id: FIXTURE_COMMENTER_ID,
      primaryEmail: "e2e-commenter@jsquaredadventures.test",
      role: "reader",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        primaryEmail: "e2e-commenter@jsquaredadventures.test",
        role: "reader",
        updatedAt: now,
      },
    });

  await db
    .insert(profiles)
    .values({
      userId: FIXTURE_COMMENTER_ID,
      displayName: "E2E Commenter",
      avatarUrl: null,
      bio: "Fixture commenter used by admin moderation smoke tests.",
      themePreference: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        displayName: "E2E Commenter",
        avatarUrl: null,
        bio: "Fixture commenter used by admin moderation smoke tests.",
        updatedAt: now,
      },
    });

  await db
    .insert(authAccounts)
    .values({
      id: FIXTURE_COMMENTER_ACCOUNT_ID,
      userId: FIXTURE_COMMENTER_ID,
      provider: "supabase",
      providerUserId: "e2e-commenter-supabase-user",
      providerEmail: "e2e-commenter@jsquaredadventures.test",
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: authAccounts.id,
      set: {
        userId: FIXTURE_COMMENTER_ID,
        providerEmail: "e2e-commenter@jsquaredadventures.test",
      },
    });
}

async function ensureFixturePost(): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db
    .insert(posts)
    .values({
      id: FIXTURE_POST_ID,
      title: "E2E Admin Fixture Post",
      slug: FIXTURE_POST_SLUG,
      contentJson: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Stable fixture content for authenticated admin smoke coverage." }],
          },
        ],
      }),
      contentFormat: "tiptap-json",
      contentHtml: null,
      contentPlainText: "Stable fixture content for authenticated admin smoke coverage.",
      excerpt: "Stable fixture post used by Playwright admin smoke tests.",
      status: "published",
      layoutType: "standard",
      publishedAt: now,
      scheduledPublishTime: null,
      authorId: FIXTURE_AUTHOR_ID,
      categoryId: FIXTURE_CATEGORY_ID,
      seriesId: null,
      seriesOrder: null,
      featuredImageId: null,
      externalGalleryUrl: null,
      externalGalleryLabel: null,
      locationName: null,
      locationLat: null,
      locationLng: null,
      locationZoom: null,
      iovanderUrl: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: posts.id,
      set: {
        title: "E2E Admin Fixture Post",
        slug: FIXTURE_POST_SLUG,
        excerpt: "Stable fixture post used by Playwright admin smoke tests.",
        status: "published",
        authorId: FIXTURE_AUTHOR_ID,
        categoryId: FIXTURE_CATEGORY_ID,
        publishedAt: now,
        updatedAt: now,
      },
    });
}

async function ensureFixtureComments(): Promise<void> {
  const db = getDb();
  const existingParentComment = await db.query.comments.findFirst({
    where: eq(comments.id, FIXTURE_PARENT_COMMENT_ID),
    columns: { id: true },
  });

  const existingReplyComment = await db.query.comments.findFirst({
    where: eq(comments.id, FIXTURE_REPLY_COMMENT_ID),
    columns: { id: true },
  });

  const now = new Date();

  if (!existingParentComment) {
    await db.insert(comments).values({
      id: FIXTURE_PARENT_COMMENT_ID,
      postId: FIXTURE_POST_ID,
      authorId: FIXTURE_COMMENTER_ID,
      content: "Fixture top-level comment for admin moderation smoke coverage.",
      parentId: null,
      visibility: "visible",
      isFlagged: false,
      moderatedAt: null,
      moderatedByUserId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (!existingReplyComment) {
    await db.insert(comments).values({
      id: FIXTURE_REPLY_COMMENT_ID,
      postId: FIXTURE_POST_ID,
      authorId: FIXTURE_COMMENTER_ID,
      content: "Fixture reply comment that keeps the moderation thread non-empty.",
      parentId: FIXTURE_PARENT_COMMENT_ID,
      visibility: "visible",
      isFlagged: false,
      moderatedAt: null,
      moderatedByUserId: null,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function main(): Promise<void> {
  const db = getDb();

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, FIXTURE_CATEGORY_ID),
    columns: { id: true },
  });

  if (!category) {
    throw new Error(
      `Missing category ${FIXTURE_CATEGORY_ID}. Run bun run ./scripts/seed-series-categories.ts before seeding E2E fixtures.`,
    );
  }

  await ensureAdminAuthor();
  await ensurePublicCommenter();
  await ensureFixturePost();
  await ensureFixtureComments();
  await writeEnvValue("E2E_ADMIN_POST_ID", FIXTURE_POST_ID);

  const commentCountRows = await db
    .select({ total: count() })
    .from(comments)
    .where(and(eq(comments.postId, FIXTURE_POST_ID), eq(comments.visibility, "visible")));

  console.log(`Seeded E2E fixture post ${FIXTURE_POST_ID} with ${Number(commentCountRows[0]?.total ?? 0)} visible comments.`);
  console.log(`Wrote E2E_ADMIN_POST_ID to ${ENV_FILE_PATH}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Failed to seed E2E fixtures: ${message}`);
  process.exit(1);
});
