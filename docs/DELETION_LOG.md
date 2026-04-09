# Code Deletion Log

## [2026-04-08] Refactor Session

### Unused Files Deleted
- None

### Duplicate Code Consolidated
- `web/scripts/seed-e2e-fixtures.ts` + `web/tests/e2e/public-authenticated.spec.ts` fixture-post literals -> `web/src/lib/e2e/fixture-post.ts`
- Reason: shared admin/public E2E fixture post metadata was duplicated and still used the older admin-only naming.

### Unused Exports Removed
- `web/src/lib/utils.ts` - Functions: `getMapHref()`, `getPreviewHref()`, `getPostIdFromSlug()`
- `web/src/server/dal/posts.ts` - Functions: `schedulePost()`, `unschedulePost()`
- `web/src/server/dal/admin-posts.ts` - Function: `getAdminPostsByIds()`
- `web/src/server/dal/post-revisions.ts` - Functions: `getPostContentSnapshot()`, `applyRevisionContentToPost()`; Type: `PostContentSnapshot`
- Reason: no internal references found in `web/src` or tests after grep verification.

### Impact
- Files added: 1 shared fixture metadata module
- Files deleted: 0
- Duplicate fixture strings consolidated: 5
- Unused exports removed: 8 functions, 1 type

### Testing
- `bun run --cwd web vitest run tests/unit/e2e-fixture-post.test.ts tests/unit/utils.test.ts tests/unit/admin-storage-state-metadata.test.ts tests/unit/public-auth-fixture.test.ts tests/unit/admin-e2e-helper.test.ts`
- `bun run --cwd web lint`
