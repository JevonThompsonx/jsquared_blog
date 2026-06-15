# Branch 7: `feat/performance-and-reliability`

**Status:** 🔵 Ready to start
**Estimated effort:** 5-6 hours
**Depends on:** Nothing

---

## Goal

Improve runtime performance and error observability. All changes are independent and ship together as a "performance and reliability" bundle.

---

## Checklist

### 7.1 Cache public post queries
- [ ] Edit `web/src/server/queries/posts.ts`
- [ ] Wrap `listPublishedPosts()` with `unstable_cache()` (Next.js built-in)
- [ ] Set TTL: 30-60 seconds
- [ ] Use tags: `['posts']` for granular invalidation
- [ ] Invalidate cache on admin publish/unpublish (call `revalidateTag('posts')`)
- [ ] Test: verify cached responses, verify invalidation works

**Files:**
- `web/src/server/queries/posts.ts`
- `web/src/app/admin/actions.ts` (add revalidation calls)

**Reference:** Next.js docs on `unstable_cache` and `revalidateTag`

---

### 7.2 Wishlist images: `next/image`
- [ ] Edit `web/src/app/(blog)/wishlist/page.tsx`
- [ ] Find line 200 with `<img>` tag (has eslint-disable comment)
- [ ] Replace with `<Image>` from `next/image`
- [ ] Add `width`, `height`, `sizes` attributes
- [ ] Remove eslint-disable comment
- [ ] Test: verify images load, verify lazy loading, verify responsive sizing

**Files:**
- `web/src/app/(blog)/wishlist/page.tsx`

---

### 7.3 Add `captureException` to 500 catch blocks
- [ ] Grep API routes for `console.error` in catch blocks returning 500
- [ ] For each match, add `captureException(error, { route, ...context })` from `@/lib/sentry`
- [ ] Focus on public-facing routes first (posts, comments, bookmarks)
- [ ] Test: trigger an error, verify it shows up in Sentry

**Files:**
- Multiple API route files (grep `console.error` to find them)

**Pattern:**
```typescript
} catch (error) {
  console.error("[route-name] Error:", error);
  captureException(error, { route: "route-name", postId });
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
```

---

### 7.4 Related posts show date + reading time
- [ ] Find related post card component (likely in `web/src/components/blog/`)
- [ ] Add `PostDate` component (import from `@/components/blog/post-date`)
- [ ] Add reading time display
- [ ] Match the style of `HomePostCard`
- [ ] Test: view post page, scroll to related posts, verify date and reading time visible

**Files:**
- `web/src/components/blog/` (related post card component)

---

### 7.5 Rate limit fallback throws in production
- [ ] Edit `web/src/lib/rate-limit.ts:173-178`
- [ ] Change `console.warn` to `throw new Error(...)` when `isDeployedEnvironment` and no Upstash
- [ ] Test locally: unset Upstash env vars, verify it throws
- [ ] Test with Upstash: verify it works normally

**Files:**
- `web/src/lib/rate-limit.ts`

---

## Pre-Commit Verification

```bash
cd web
pnpm run test
pnpm dlx tsc --noEmit
pnpm run lint
```

---

## Commit Strategy

```
perf: add 30s cache to public post queries with tag-based invalidation
perf: use next/image for wishlist images
fix: add Sentry exception capture to 500 error paths
feat: show date and reading time on related post cards
fix: throw on missing Upstash config in production rate limiter
```

---

## Acceptance Criteria

- [ ] All 5 checklist items complete
- [ ] Query caching works and invalidates correctly
- [ ] Wishlist images optimized
- [ ] Sentry captures 500 errors
- [ ] Related posts show metadata
- [ ] Rate limiter fails hard in production
- [ ] CI passes
- [ ] PR created and merged to main
- [ ] `docs/ROADMAP.md` status table updated to ✅ Merged
- [ ] `docs/CHANGELOG.md` entry added
- [ ] Branch deleted
