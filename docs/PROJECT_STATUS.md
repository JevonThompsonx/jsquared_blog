# J²Adventures Project Status

Last updated: 2026-02-28

## Overview

This document captures the current state of the J²Adventures Blog project, recent fixes, and remaining follow-ups. It is intended as a working snapshot after a large AI-assisted overhaul.

## What Was Fixed

### Auth and Routing
- Stabilized auth initialization and removed hanging login states.
- Added safe timeouts and retry logic for session retrieval.
- Added auth redirect back to the requested page.
- Added profile load status so admin routes don’t redirect while role is loading.
- `/settings` now redirects to `/profile` (Account Settings page).

### UI / UX
- Removed nested link warnings on home hover cards.
- Search clears when clicking the J²Adventures brand.
- Tag chips on Post Detail link to `/tag/:slug`.
- Category and tag pages now include the clicked post reliably.
- Alt text shows on hover in image galleries.

### API / Backend
- Fixed `/api/posts/:id` to return 404 on missing posts rather than 500.
- Auto‑publish scheduled posts uses service role (when available) to avoid RLS blocking updates.
- Added `/api/admin/publish-scheduled` to force publishing of past‑due scheduled posts.

### Tooling
- Clean build and lint runs (client/server) with warnings removed or acknowledged.
- Shared test suite passing.

## Current Status

**Stable:**
- Auth flow, admin routing, comment system, tag CRUD, image upload, and standard post creation/editing.
- Publish Past‑Due Scheduled Posts endpoint works and reports success.

**In progress / needs confirmation:**
- Posts `42` and `43` still do not appear on the public homepage after being published via the admin endpoint.
- Confirm whether these posts are actually `published` in the database or if the homepage query is filtering them out.

## Admin Tools Added

- **Publish Past‑Due Scheduled Posts:**
  - Button in Admin Dashboard to publish all posts that are past their scheduled time.
  - Endpoint: `POST /api/admin/publish-scheduled`

## Remaining Follow‑Ups

1. Verify `Publish Past‑Due Scheduled Posts` button publishes posts 42 and 43.
2. Confirm those posts appear on the homepage after refresh.
3. If still missing, inspect the posts’ `status`, `published_at`, and `scheduled_for` values in Supabase.
4. If needed, add admin visibility for scheduled posts on tag/category pages.

## Notes

- Console noise from Bitwarden/extension logs can be ignored.
- The remaining auth log spam appears to be retry patterns during session checks and is non‑blocking.

## Project Structure

- `client/` React frontend (Vite)
- `server/` Hono API (Cloudflare Worker)
- `shared/` shared TypeScript types
