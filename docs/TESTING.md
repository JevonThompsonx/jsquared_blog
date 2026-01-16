# Testing Guide

This guide covers testing the features of J²Adventures Blog.

---

## Prerequisites

1. **Database migrations applied** - Run `server/migrations/APPLY_ALL_MIGRATIONS.sql` in Supabase SQL Editor
2. **Dependencies installed** - Run `bun install` in project root
3. **Environment variables set** - `.dev.vars` in `server/` and `.env` in `client/`

---

## Starting the Development Server

```bash
# From project root
bun run dev
```

This starts:
- Backend API on `http://127.0.0.1:8787`
- Frontend on `http://localhost:5173`

---

## Feature Testing

### Tags System

**What to Test:**
- Create a post with tags (Admin page)
- Tag autocomplete with search
- Create custom tags
- View tags on post cards (homepage)
- View tags on post detail page
- Edit post tags

**Steps:**
1. Navigate to `/admin`
2. Fill in post details
3. In the "Tags" section:
   - Type "adv" → Should see "Adventure" suggestion
   - Press Enter to add
   - Type "custom tag" → Should see "Create 'custom tag'" option
4. Save the post
5. Verify tags appear on homepage and post detail

---

### Post Scheduling

**What to Test:**
- Schedule a post for future
- Verify scheduled post doesn't appear publicly
- Auto-publishing (request-time or cron)
- Blue "SCHEDULED" badge visibility (admin only)

**Steps:**
1. Navigate to `/admin`
2. Select status: **Scheduled**
3. Pick a datetime 2 minutes in the future
4. Save the post
5. Verify post doesn't appear on homepage
6. Wait until scheduled time passes
7. Visit the post directly or refresh homepage
8. Post should auto-publish

**Note:** Cron triggers (every 15 min) only work in production. Local dev uses request-time auto-publishing.

---

### Image Alt Text

**What to Test:**
- Add alt text to new images
- Edit alt text on existing images
- Visual indicators (green = has alt, yellow = needs alt)
- Alt text appears in HTML `alt` attribute

**Steps:**
1. Navigate to `/admin` or edit a post
2. Upload an image
3. Click the yellow "Add alt text" button
4. Enter description and save
5. Button should turn green
6. View the post and inspect image element
7. Verify `alt` attribute contains your text

---

### Comments System

**What to Test:**
- Add comments (authenticated)
- Like comments
- Sort by likes/newest/oldest
- Delete own comments
- Login prompt for unauthenticated users

**Steps:**
1. View any blog post
2. Scroll to comments section
3. Log in if prompted
4. Add a comment
5. Like a comment (heart icon)
6. Try different sort options
7. Delete your comment

---

### Draft Posts

**What to Test:**
- Save post as draft
- Draft not visible publicly
- "DRAFT" badge visible to admin
- Publish from draft

**Steps:**
1. Create a post with status "Draft"
2. Save the post
3. Log out → Post should not appear
4. Log in as admin → Post should show "DRAFT" badge
5. Edit post, change status to "Published"
6. Post now appears publicly

---

### User Profiles

**What to Test:**
- Update display name
- Change avatar (letter, icon, or custom)
- Theme preference persistence
- Profile dropdown in navbar

**Steps:**
1. Log in and go to `/settings`
2. Update display name → Should save immediately
3. Change avatar style and color
4. Upload custom avatar (if desired)
5. Change theme preference
6. Log out and back in → Theme should persist

---

### Infinite Scroll

**What to Test:**
- Initial load (20 posts)
- Scroll to load more
- Loading indicator
- "End of adventures" message

**Steps:**
1. Ensure database has 25+ posts (run seed if needed)
2. Visit homepage
3. Scroll to bottom
4. Should see loading spinner, then more posts
5. Continue until all posts loaded
6. Should see "end of adventures" message

---

### Search

**What to Test:**
- Search by title
- Search by category
- Search debouncing (400ms)
- Keyboard shortcut (Ctrl+K)

**Steps:**
1. Visit homepage
2. Press Ctrl+K → Search should focus
3. Type a search term
4. Wait 400ms → Results should filter
5. Clear search → All posts return

---

## Backend API Testing

### Using curl

```bash
# Get all posts
curl http://127.0.0.1:8787/api/posts

# Get posts with pagination
curl "http://127.0.0.1:8787/api/posts?limit=10&offset=0"

# Search posts
curl "http://127.0.0.1:8787/api/posts?search=hiking"

# Get single post
curl http://127.0.0.1:8787/api/posts/1

# Get tags
curl http://127.0.0.1:8787/api/tags

# Get comments
curl http://127.0.0.1:8787/api/posts/1/comments
```

### Authenticated Requests
For admin endpoints, include Authorization header:
```bash
curl -X POST http://127.0.0.1:8787/api/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "description": "Test post", "category": "Hiking"}'
```

---

## Verification Checklists

### Core Features
- [ ] Homepage loads with posts
- [ ] Infinite scroll works
- [ ] Search filters posts
- [ ] Post detail page displays correctly
- [ ] Image gallery works (arrows, zoom)
- [ ] Category pages work

### Admin Features
- [ ] Create post with images
- [ ] Edit existing post
- [ ] Delete post (with confirmation)
- [ ] Tags autocomplete
- [ ] Schedule post for future
- [ ] Alt text editor works

### User Features
- [ ] Sign up / Login works
- [ ] Profile settings save
- [ ] Avatar updates immediately
- [ ] Theme preference persists
- [ ] Comments work
- [ ] Comment likes work

### SEO
- [ ] Sitemap accessible at `/sitemap.xml`
- [ ] Page titles update correctly
- [ ] Meta descriptions present
- [ ] Open Graph images work (test with social media debuggers)

---

## Common Issues

### Tags not appearing
- Run database migration: `APPLY_ALL_MIGRATIONS.sql`

### Scheduled posts not auto-publishing
- Cron only works in production
- Local: posts auto-publish on page request after scheduled time

### Alt text not saving
- Ensure database has `alt_text` column in `post_images`

### Display name stuck on "Saving..."
- Check browser console for errors
- Clear localStorage and try again

### TypeScript errors
- Restart dev server: `Ctrl+C` then `bun run dev`

---

## Debugging Tips

1. **Browser Console** (F12 → Console tab)
   - Check for JavaScript errors
   - View API response logs

2. **Network Tab** (F12 → Network tab)
   - Verify API calls succeed
   - Check response payloads

3. **Supabase Dashboard**
   - View table data directly
   - Check RLS policies
   - View auth logs

4. **Clear Cache**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

5. **Restart Server**
   ```bash
   # Stop with Ctrl+C, then:
   bun run dev
   ```
