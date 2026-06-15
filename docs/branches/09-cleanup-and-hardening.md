# Branch 9: `chore/cleanup-and-hardening`

**Status:** 🟢 In Progress
**Estimated effort:** 3-4 hours
**Depends on:** Nothing

---

## Goal

Small, unrelated cleanup tasks that don't warrant individual branches. Grouped as "housekeeping" — code quality and observability improvements without changing user-facing behavior.

---

## Checklist

### 9.1 Zod schema for song preview
- [ ] Edit `web/src/app/api/admin/song-preview/route.ts`
- [ ] Replace manual body validation with Zod schema:
  ```typescript
  const songPreviewSchema = z.object({
    url: z.string().url().max(2048),
  });
  const { url } = songPreviewSchema.parse(await request.json());
  ```
- [ ] Test: invalid URL returns 400, valid URL works

**Files:**
- `web/src/app/api/admin/song-preview/route.ts`

---

### 9.2 Remove or rate-limit `/api/route-plans`
- [ ] Edit `web/src/app/api/route-plans/route.ts`
- [ ] Option A: Add `checkRateLimit()` (simpler, keeps endpoint as 410)
- [ ] Option B: Delete the endpoint entirely (cleaner, but requires updating any clients)
- [ ] Recommend Option A for now
- [ ] Test: rapid requests return 429

**Files:**
- `web/src/app/api/route-plans/route.ts`

---

### 9.3 Post deletion Cloudinary cleanup
- [ ] Edit `web/src/server/posts/delete.ts`
- [ ] Before deleting post, fetch associated `mediaAssets` (from `postImages` join)
- [ ] Call Cloudinary `uploader.destroy()` for each asset
- [ ] Handle errors gracefully (log but don't block post deletion)
- [ ] Test: delete a post with images, verify Cloudinary assets are removed

**Files:**
- `web/src/server/posts/delete.ts`
- `web/src/lib/cloudinary/` (use existing `cloudinary.uploader.destroy`)

---

### 9.4 Structured request logging in proxy
- [ ] Edit `web/src/proxy.ts`
- [ ] Add lightweight request logger that logs: method, path, status, duration
- [ ] Use `console.info` or create a simple logger
- [ ] Only log in production (or use log level filtering)
- [ ] Test: make requests, verify logs appear

**Files:**
- `web/src/proxy.ts`

**Pattern:**
```typescript
const start = Date.now();
// ... existing proxy logic ...
console.info(`[proxy] ${method} ${pathname} ${status} ${Date.now() - start}ms`);
```

---

### 9.5 Cron job health metrics
- [ ] Edit `web/src/app/api/cron/publish-scheduled/route.ts`
- [ ] After running, log metrics: `scanned: N, published: M, errors: E`
- [ ] Send metric to Sentry as a breadcrumb or custom event
- [ ] Test: run cron, verify metrics logged

**Files:**
- `web/src/app/api/cron/publish-scheduled/route.ts`

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
refactor: use Zod schema for song preview validation
chore: add rate limiting to retired /api/route-plans endpoint
fix: clean up Cloudinary assets when posts are deleted
chore: add structured request logging to proxy middleware
chore: add health metrics to publish-scheduled cron job
```

---

## Acceptance Criteria

- [ ] All 5 checklist items complete
- [ ] Song preview uses Zod
- [ ] Route-plans rate-limited
- [ ] Cloudinary cleanup works
- [ ] Request logging works
- [ ] Cron metrics logged
- [ ] CI passes
- [ ] PR created and merged to main
- [ ] `docs/ROADMAP.md` status table updated to ✅ Merged
- [ ] `docs/CHANGELOG.md` entry added
- [ ] Branch deleted
