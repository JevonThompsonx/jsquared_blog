import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";

import { postPreviewTokens, posts } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

const PREVIEW_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

export type PostPreviewAccess = {
  postId: string;
  previewPath: `/preview/${string}`;
  token: string;
  expiresAt: string;
};

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createPostPreviewAccess(postId: string, issuedByUserId: string): Promise<PostPreviewAccess> {
  const db = getDb();
  const existingPost = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    columns: { id: true },
  });

  if (!existingPost) {
    throw new Error(`Post ${postId} not found`);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + PREVIEW_TOKEN_TTL_MS);
  const token = crypto.randomUUID();
  const tokenHash = await sha256Hex(token);

  await db.insert(postPreviewTokens).values({
    id: crypto.randomUUID(),
    tokenHash,
    postId,
    issuedByUserId,
    expiresAt,
    revokedAt: null,
    lastUsedAt: null,
    createdAt: now,
  });

  return {
    postId,
    previewPath: `/preview/${postId}?token=${token}`,
    token,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function validatePostPreviewToken(postId: string, token: string): Promise<boolean> {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return false;
  }

  const tokenHash = await sha256Hex(trimmedToken);
  const db = getDb();
  const now = new Date();

  const previewToken = await db.query.postPreviewTokens.findFirst({
    where: and(
      eq(postPreviewTokens.postId, postId),
      eq(postPreviewTokens.tokenHash, tokenHash),
      isNull(postPreviewTokens.revokedAt),
      gt(postPreviewTokens.expiresAt, now),
    ),
    columns: { id: true },
  });

  if (!previewToken) {
    return false;
  }

  await db
    .update(postPreviewTokens)
    .set({ lastUsedAt: now })
    .where(eq(postPreviewTokens.id, previewToken.id));

  return true;
}

export async function revokePostPreviewTokens(postId: string): Promise<void> {
  const db = getDb();
  await db
    .update(postPreviewTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(postPreviewTokens.postId, postId), isNull(postPreviewTokens.revokedAt)));
}
