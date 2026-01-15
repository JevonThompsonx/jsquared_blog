# Testing Guide for New Features

This guide covers testing the three new features that were just implemented: **Tags System**, **Post Scheduling**, and **Image Alt Text**.

---

## Prerequisites

Before testing, ensure:

1. **Database migrations are applied** - Run the SQL in `server/migrations/APPLY_ALL_MIGRATIONS.sql` in your Supabase SQL Editor
2. **Dependencies are installed** - Run `bun install` in the project root
3. **Environment variables are set** - Ensure `.dev.vars` in `server/` and `.env` in `client/` have your Supabase credentials

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

## Feature 1: Tags System

### What Was Added
- Database tables: `tags` and `post_tags`
- 10 predefined tags (Adventure, Family, Solo, Budget, Luxury, Weekend, Long Trip, Local, International, Tips)
- Custom tag creation
- Tag autocomplete with search
- Tag display on post cards and detail pages

### Testing Steps

#### 1. Verify Database Setup
1. Open Supabase Dashboard → SQL Editor
2. Run: `SELECT * FROM tags;`
3. ✅ Should see 10 predefined tags

#### 2. Create a Post with Tags (Admin)
1. Navigate to `/admin`
2. Fill in post details (title, description, category)
3. In the "Tags" section:
   - Type "adv" → Should see "Adventure" suggestion
   - Press Enter or click to add
   - Type "custom tag" → Should see "Create 'custom tag'" option
   - Add it
4. Add at least one image
5. Click "Create Post"
6. ✅ Post should be created with tags saved

#### 3. View Tags on Homepage
1. Navigate to `/`
2. Find the post you just created
3. ✅ Should see tag badges below the category badge
4. ✅ If post has more than 3 tags, should show "+N" indicator

#### 4. View Tags on Post Detail Page
1. Click on the post
2. ✅ Should see all tags displayed below the date/reading time
3. ✅ Tags should have tag icon and styled pills

#### 5. Edit Post Tags
1. Click "Edit Post" on the post detail page
2. ✅ Existing tags should be pre-loaded
3. Remove a tag by clicking the X
4. Add a new tag
5. Save the post
6. ✅ Changes should persist

#### 6. Test Tag Autocomplete
1. Go to `/admin` or edit a post
2. In the Tags field:
   - Type partial tag name → Should filter suggestions
   - Use arrow keys to navigate suggestions
   - Press Enter to select
   - Press Backspace on empty field → Should remove last tag
   - Press Escape → Should close dropdown

---

## Feature 2: Post Scheduling

### What Was Added
- `scheduled_for` and `published_at` columns in `posts` table
- Status now supports: `draft`, `published`, `scheduled`
- Datetime picker for scheduling posts
- Auto-publishing via Cloudflare Workers cron (every 15 minutes)
- Fallback auto-publishing on page requests

### Testing Steps

#### 1. Schedule a Post for Future
1. Navigate to `/admin`
2. Fill in post details
3. Select status: **Scheduled**
4. ✅ Date/time picker should appear
5. Pick a time 2 minutes in the future
6. Create the post
7. ✅ Post should NOT appear on homepage (not published yet)

#### 2. Verify Scheduled Post in Database
1. Supabase Dashboard → Table Editor → `posts`
2. Find your post
3. ✅ `status` should be "scheduled"
4. ✅ `scheduled_for` should have your chosen datetime
5. ✅ `published_at` should be NULL

#### 3. Test Auto-Publishing (Request-Time)
1. Wait until the scheduled time passes (2+ minutes)
2. Visit the post directly: `/posts/{id}` (replace {id} with post ID)
3. ✅ Post should auto-publish on page load
4. ✅ Status badge should change from "SCHEDULED" to normal
5. ✅ Post should now appear on homepage

#### 4. Test Auto-Publishing (Cron - Production Only)
**Note**: Cron triggers only work in production Cloudflare Workers, not local dev

To test in production:
1. Deploy to Cloudflare: `cd server && bunx wrangler deploy`
2. Create a scheduled post for 20 minutes in the future
3. Wait 20+ minutes
4. ✅ Post should auto-publish (check every 15 min via cron)

#### 5. Test Scheduling Validation
1. Try to create a scheduled post without selecting a datetime
2. ✅ Should show error: "Please select a date and time"
3. Try to schedule for a past time
4. ✅ Should show error: "Scheduled time must be in the future"

#### 6. Edit Scheduled Post
1. Edit a scheduled post before it publishes
2. Change the scheduled time
3. Save
4. ✅ New time should be saved
5. ✅ Auto-publishing should respect new time

---

## Feature 3: Image Alt Text

### What Was Added
- `alt_text` column in `post_images` table
- Alt text editor modal in ImageUploader
- Visual indicator (green = has alt text, yellow = needs alt text)
- Alt text displayed in image galleries for screen readers
- Alt text saved/updated for existing and new images

### Testing Steps

#### 1. Add Alt Text to New Image
1. Navigate to `/admin`
2. Upload an image
3. ✅ Should see yellow "Add alt text" button on image thumbnail
4. Click the alt text button
5. ✅ Modal should open with textarea
6. Type: "Sunset over mountain peaks with orange sky"
7. Click "Save"
8. ✅ Button should turn green
9. Create the post
10. ✅ Alt text should be saved to database

#### 2. Verify Alt Text in Database
1. Supabase Dashboard → Table Editor → `post_images`
2. Find your image record
3. ✅ `alt_text` column should have your description

#### 3. Edit Alt Text on Existing Image
1. Edit a post that has images
2. Click the alt text button on an image
3. Update the text
4. Save the post
5. ✅ Alt text should update in database

#### 4. View Alt Text in HTML (Accessibility)
1. Visit a post with images: `/posts/{id}`
2. Right-click on an image → "Inspect Element"
3. ✅ `<img>` tag should have `alt` attribute with your text
4. If no alt text was provided:
   - ✅ Should have fallback like "Post image 1", "Post image 2", etc.

#### 5. Test Screen Reader Support
1. Use a screen reader (VoiceOver on Mac, NVDA on Windows)
2. Navigate to a post with images
3. ✅ Screen reader should read the alt text when focusing on images

#### 6. Test Alt Text in Image Gallery
1. Visit a post with multiple images
2. Navigate through the gallery (arrows or auto-advance)
3. Inspect each image
4. ✅ Each image should have its own alt text

---

## Backend API Testing

### Test Tags Endpoints

```bash
# Get all tags
curl http://127.0.0.1:8787/api/tags

# Get tags for a specific post
curl http://127.0.0.1:8787/api/posts/1/tags

# Create a new tag (admin only, requires auth token)
curl -X POST http://127.0.0.1:8787/api/tags \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Epic Adventure", "slug": "epic-adventure"}'

# Update post tags (admin only, requires auth token)
curl -X PUT http://127.0.0.1:8787/api/posts/1/tags \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tags": [{"id": 1, "name": "Adventure", "slug": "adventure"}, {"id": 2, "name": "Family", "slug": "family"}]}'
```

### Test Scheduled Posts

```bash
# Get all posts (should include scheduled posts for admins only)
curl http://127.0.0.1:8787/api/posts?status=scheduled \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Create a scheduled post
curl -X POST http://127.0.0.1:8787/api/posts \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Scheduled Post",
    "description": "This is scheduled",
    "category": "Hiking",
    "status": "scheduled",
    "scheduled_for": "2026-01-13T18:00:00Z"
  }'
```

### Test Alt Text Endpoints

```bash
# Update alt text for an image
curl -X PUT http://127.0.0.1:8787/api/posts/1/images/5/alt-text \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alt_text": "Beautiful mountain landscape at sunset"}'
```

---

## Common Issues & Troubleshooting

### Issue: Tags not appearing
- **Check**: Database migrations applied?
- **Fix**: Run `server/migrations/APPLY_ALL_MIGRATIONS.sql` in Supabase SQL Editor

### Issue: Scheduled posts not auto-publishing
- **Check**: Are you testing locally? Cron only works in production
- **Fix**: Deploy to Cloudflare or rely on request-time auto-publishing

### Issue: Alt text not saving
- **Check**: Database migration for alt_text column applied?
- **Fix**: Run the migration SQL

### Issue: TypeScript errors after changes
- **Fix**: Restart the dev server: `Ctrl+C` then `bun run dev`

---

## Verification Checklist

Before considering features complete, verify:

### Tags System
- [ ] 10 predefined tags exist in database
- [ ] Can create custom tags
- [ ] Tags show on homepage post cards
- [ ] Tags show on post detail pages
- [ ] Tags show on category pages
- [ ] Can add/remove tags when creating posts
- [ ] Can add/remove tags when editing posts
- [ ] Tag autocomplete works
- [ ] Backend returns tags with posts

### Post Scheduling
- [ ] Can schedule posts for future dates
- [ ] Scheduled posts don't appear on homepage
- [ ] Scheduled posts auto-publish on page request after scheduled time
- [ ] Validation prevents past dates
- [ ] Validation requires datetime when status is "scheduled"
- [ ] Database columns (scheduled_for, published_at) exist
- [ ] Cron trigger configured in wrangler.toml
- [ ] Scheduled handler exports in index.ts

### Image Alt Text
- [ ] Alt text column exists in post_images table
- [ ] Can add alt text to new images
- [ ] Can edit alt text on existing images
- [ ] Visual indicator (green/yellow) shows alt text status
- [ ] Alt text appears in HTML img tags
- [ ] Alt text works with screen readers
- [ ] Fallback alt text for images without custom text
- [ ] Backend saves/returns alt text

---

## Next Steps After Testing

1. **Deploy to Production**
   - Backend: `cd server && bunx wrangler deploy`
   - Frontend: Push to GitHub (Cloudflare Pages auto-deploys)

2. **Monitor Cron Jobs**
   - Check Cloudflare Workers dashboard for cron execution logs

3. **Update Documentation**
   - Update README with new features
   - Add examples to CLAUDE.md

4. **User Training**
   - Show admins how to use tags
   - Demonstrate scheduling workflow
   - Explain importance of alt text for accessibility

---

**Happy Testing! 🎉**
