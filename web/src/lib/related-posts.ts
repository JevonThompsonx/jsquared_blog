import type { BlogPost } from "@/types/blog";

type RelatedPostLike = Pick<BlogPost, "id" | "slug" | "category" | "createdAt" | "tags">;

export function getRelatedPostScore(currentPost: RelatedPostLike, candidate: RelatedPostLike): number {
  let score = 0;
  const currentTagSlugs = new Set(currentPost.tags.map((tag) => tag.slug));

  if (currentPost.category && candidate.category === currentPost.category) {
    score += 3;
  }

  for (const tag of candidate.tags) {
    if (currentTagSlugs.has(tag.slug)) {
      score += 2;
    }
  }

  const currentDate = new Date(currentPost.createdAt).getTime();
  const candidateDate = new Date(candidate.createdAt).getTime();
  const daysDiff = Math.abs(candidateDate - currentDate) / (1000 * 60 * 60 * 24);

  if (daysDiff <= 90) {
    score += 1;
  }

  return score;
}

export function rankRelatedPosts<T extends RelatedPostLike>(
  currentPost: RelatedPostLike,
  candidates: T[],
  limit: number,
): T[] {
  if (limit <= 0) {
    return [];
  }

  const uniqueCandidates = new Map<string, T>();

  for (const candidate of candidates) {
    if (candidate.id === currentPost.id || candidate.slug === currentPost.slug) {
      continue;
    }

    if (!uniqueCandidates.has(candidate.id)) {
      uniqueCandidates.set(candidate.id, candidate);
    }
  }

  return Array.from(uniqueCandidates.values())
    .map((candidate) => ({
      candidate,
      score: getRelatedPostScore(currentPost, candidate),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        new Date(right.candidate.createdAt).getTime() - new Date(left.candidate.createdAt).getTime(),
    )
    .slice(0, limit)
    .map((entry) => entry.candidate);
}
