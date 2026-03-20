# ADR-0001: Post Revision History

**Date**: 2026-03-19
**Status**: Accepted
**Deciders**: Claude Sonnet 4.6 (Architect), Jevon

## Context

The admin post editor saves changes directly to the `posts` table with no history. If an edit destroys content or introduces a regression, there is no way to recover the previous state without restoring from a database backup. A lightweight revision log would allow the admin to view and restore previous versions of a post's content.

## Decision

Add a `post_revisions` table that captures a snapshot of the mutable content fields at each save. Revisions are append-only (never updated, only inserted). The current authoritative state is always in `posts`; revisions are a read-only audit trail.

### Schema

```sql
post_revisions (
  id           TEXT PRIMARY KEY,          -- CUID2
  post_id      TEXT NOT NULL REFERENCES posts(id),
  revision_num INTEGER NOT NULL,          -- monotonically increasing per post, app-enforced
  title        TEXT NOT NULL,
  content_json TEXT NOT NULL,
  excerpt      TEXT,
  saved_by_user_id TEXT NOT NULL REFERENCES users(id),
  saved_at     INTEGER NOT NULL,          -- timestamp_ms
  label        TEXT                       -- optional human label (e.g. "Before refactor")
)
```

Indexes:
- `(post_id, revision_num DESC)` — for listing revisions for a post, most recent first
- `(post_id, saved_at DESC)` — for time-ordered listing

### Behavior

- A revision is created by calling `createPostRevision()` in the DAL, which inserts a new row with `revision_num = MAX(revision_num) + 1` for that `post_id`.
- The save endpoint (`PUT /api/admin/posts/[postId]`) is responsible for calling `createPostRevision()` before applying the update.
- The revision API (`GET /api/admin/posts/[postId]/revisions`) returns a paginated list of revisions (most recent first), limited to 50 per page.
- A restore endpoint (`POST /api/admin/posts/[postId]/revisions/[revisionId]/restore`) copies the revision's `title`, `content_json`, and `excerpt` back to the `posts` table (also creates a new revision for the pre-restore state first).

### Scope for this task

This ADR covers only the storage layer and read API. The restore endpoint and admin diff viewer UI are deferred to a follow-up.

## Consequences

### Positive
- Content is recoverable without a database restore.
- Provides a full audit trail of who saved what and when.
- Append-only — no mutation of existing revision rows, so there is no risk of revision corruption.
- No breaking changes to existing `posts` table.

### Negative
- Storage grows unboundedly. A pruning strategy (keep last N revisions per post) will be needed over time but is deferred.
- `revision_num` is app-enforced (not a DB sequence), which requires a `MAX() + 1` read-then-write pattern. Acceptable for low-concurrency admin writes; a unique constraint on `(post_id, revision_num)` prevents duplicates under race conditions.

### Neutral
- The `label` field is optional and admin-only — it will not be surfaced in the initial implementation.
- Revisions store only the mutable content fields, not media, tags, category, or location data.

## Alternatives Considered

| Option | Pros | Cons | Why rejected |
|---|---|---|---|
| Store full post snapshots (all columns) | Simpler restore logic | Large storage footprint; blobs media asset IDs that are not content | Overkill for the primary use case (content recovery) |
| Event sourcing (store diffs only) | Minimal storage | Requires diff/patch library; complex to restore | Complexity not warranted for this scale |
| Use Turso's built-in WAL/point-in-time recovery | Zero app code | Requires Turso Pro plan; not under app control | Operational dependency; not self-service for admin |
