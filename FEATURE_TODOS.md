# Feature Todo List

## Performance & Core Functionality (URGENT)

### 1. Implement Infinite Scroll ⭐ HIGH PRIORITY
**Why**: Currently loads all posts at once - will break with 100+ posts
- [ ] Add pagination parameters to `/api/posts` endpoint (`limit`, `offset` or cursor)
- [ ] Implement intersection observer on frontend to detect scroll position
- [ ] Load initial batch (20-30 posts)
- [ ] Load more posts when user scrolls near bottom
- [ ] Add "Loading more..." indicator
- [ ] Handle edge case: last page of posts
- [ ] Update CLAUDE.md with new pagination pattern

### 2. Add Search Debouncing ⭐ HIGH PRIORITY
**Why**: Search filters on every keystroke, causing unnecessary work
- [ ] Implement debounce hook or use `useDeferredValue`
- [ ] Set debounce delay to 300-500ms
- [ ] Add loading indicator during search
- [ ] Consider server-side search for better performance

## Category & Organization Features

### 3. Category System ⭐ MEDIUM PRIORITY
**Why**: User specifically mentioned wanting this
- [ ] Add category filter dropdown/pills in navbar
- [ ] Create dedicated category pages (`/category/:name`)
- [ ] Update backend to support category filtering (`/api/posts?category=X`)
- [ ] Add category management in admin dashboard
- [ ] Consider predefined categories vs. free-form tags
- [ ] Add "All Categories" view
- [ ] Show post count per category

### 4. Tag System
**Why**: More flexible than categories, allows multiple tags per post
- [ ] Add `tags` array field to posts table
- [ ] Create tag input component in post editor
- [ ] Add tag filtering to search
- [ ] Create tag cloud or tag list component
- [ ] Clickable tags on posts that filter by tag

### 5. Featured Posts
**Why**: Highlight important or favorite posts
- [ ] Add `featured` boolean to posts table
- [ ] Create "Featured" section on homepage (above regular posts)
- [ ] Add toggle in admin dashboard to mark posts as featured
- [ ] Limit to 3-5 featured posts
- [ ] Different visual style for featured posts

## Content & Media Enhancements

### 6. Rich Text Editor
**Why**: Better content creation experience
- [ ] Replace plain textarea with rich text editor (Tiptap, Lexical, or Quill)
- [ ] Support formatting: bold, italic, headings, lists
- [ ] Support embedded images within post content
- [ ] Support embedded videos (YouTube, Vimeo)
- [ ] Support code blocks (if you write technical posts)
- [ ] Store as HTML or Markdown

### 7. Multiple Images Per Post
**Why**: Blog posts often need multiple photos
- [ ] Add `images` array or separate `post_images` table
- [ ] Create image gallery component
- [ ] Add lightbox/modal for full-size viewing
- [ ] Drag-and-drop to reorder images
- [ ] Set primary/cover image

### 8. Image Gallery View
**Why**: Photo-focused blog should showcase images
- [ ] Create dedicated gallery page (`/gallery`)
- [ ] Grid layout showing all photos from all posts
- [ ] Filter by category/tag
- [ ] Masonry layout option
- [ ] Click to view post

### 9. Video Support
**Why**: Adventures are great in video format
- [ ] Add video upload to Supabase Storage
- [ ] Or embed YouTube/Vimeo links
- [ ] Video player component
- [ ] Thumbnail generation
- [ ] Video posts with separate type

## User Experience & Engagement

### 10. Comments System
**Why**: Engage readers, gather feedback
- [ ] Create `comments` table (already in plan.md!)
- [ ] Add comment form on post detail page
- [ ] Require authentication to comment
- [ ] Admin moderation (approve/delete)
- [ ] Email notifications for new comments
- [ ] Reply/threading support (optional)

### 11. Likes/Reactions
**Why**: Simple engagement mechanism
- [ ] Add `likes` count to posts
- [ ] Create `post_likes` table (user_id, post_id)
- [ ] Heart/like button on posts
- [ ] Show like count
- [ ] Prevent duplicate likes (one per user)
- [ ] "Most liked" filter

### 12. Reading Time Estimate
**Why**: Helps users decide what to read
- [ ] Calculate based on content length
- [ ] Display on post cards and detail page
- [ ] Format: "5 min read"

### 13. Breadcrumbs Navigation
**Why**: Helps users understand where they are
- [ ] Add breadcrumb component
- [ ] Show on post detail and category pages
- [ ] Home > Category > Post Title

### 14. Related Posts
**Why**: Keep users engaged, discover more content
- [ ] Show 3-4 related posts at bottom of post detail
- [ ] Match by category or tags
- [ ] Or show "More from [Author]"

### 15. Share Buttons
**Why**: Spread the word about adventures
- [ ] Add social share buttons (Twitter, Facebook, WhatsApp, copy link)
- [ ] On post detail page
- [ ] Consider native share API for mobile

## Admin & Management

### 16. Draft Posts
**Why**: Work in progress shouldn't be public
- [ ] Add `status` field to posts (`draft`, `published`)
- [ ] Filter published posts on frontend
- [ ] Show all posts in admin dashboard
- [ ] "Publish" button in admin

### 17. Scheduled Publishing
**Why**: Plan content in advance
- [ ] Add `publish_at` timestamp to posts
- [ ] Only show posts where `publish_at <= now()`
- [ ] Schedule UI in admin dashboard

### 18. Post Analytics
**Why**: Understand what content resonates
- [ ] Track view count per post
- [ ] Show in admin dashboard
- [ ] Optional: use Cloudflare Analytics or Google Analytics
- [ ] Display popular posts

### 19. Bulk Actions
**Why**: Manage multiple posts efficiently
- [ ] Checkbox select multiple posts
- [ ] Bulk delete
- [ ] Bulk category change
- [ ] Bulk publish/unpublish

## Search & Discovery

### 20. Advanced Search
**Why**: Help users find specific content
- [ ] Search by date range
- [ ] Search by author (if multi-author)
- [ ] Search by category + keyword
- [ ] Search filters UI

### 21. Archive/Timeline View
**Why**: Browse posts chronologically
- [ ] Group posts by year/month
- [ ] Timeline visualization
- [ ] "On This Day" feature

### 22. Map View (Adventure-Specific!)
**Why**: Adventures happen at locations
- [ ] Add `location` field to posts (lat/lng or place name)
- [ ] Create map page showing all adventure locations
- [ ] Use Mapbox or Leaflet
- [ ] Click location to see posts from that place
- [ ] Could be a unique differentiator for your blog!

## Author Features (Multi-Author Support)

### 23. Author Profiles
**Why**: It's a couple's blog - showcase both authors
- [ ] Add `author_name`, `author_bio`, `author_avatar` to profiles
- [ ] Create author profile pages (`/author/:username`)
- [ ] Show all posts by author
- [ ] Display author info on posts
- [ ] Filter by author

### 24. About Page
**Why**: Tell your story
- [ ] Create `/about` page
- [ ] Tell story about J²Adventures
- [ ] Photos of you both
- [ ] Contact information

### 25. Contact Page
**Why**: Let readers reach out
- [ ] Create `/contact` page
- [ ] Contact form (email via Supabase Edge Functions)
- [ ] Or display email/social links

## Performance & Technical

### 26. Image Optimization Pipeline
**Why**: Faster load times
- [ ] Generate multiple Cloudflare Images variants
- [ ] Use srcset for responsive images
- [ ] WebP format with JPEG fallback
- [ ] Lazy load below-the-fold images (already done!)

### 27. PWA Support
**Why**: Work offline, installable
- [ ] Add service worker
- [ ] Cache posts for offline reading
- [ ] Add manifest.json
- [ ] Make installable on mobile

### 28. RSS Feed
**Why**: Let readers subscribe
- [ ] Generate RSS/Atom feed
- [ ] Endpoint: `/feed.xml`
- [ ] Include recent posts

### 29. SEO Improvements
**Why**: Get discovered on Google
- [ ] Add meta tags (Open Graph, Twitter Cards)
- [ ] Generate sitemap.xml
- [ ] Add structured data (Schema.org)
- [ ] Optimize page titles and descriptions

### 30. Error Handling & Monitoring
**Why**: Know when things break
- [ ] Add error boundaries
- [ ] Better error messages for users
- [ ] Set up Sentry or similar for error tracking
- [ ] Add health check endpoint

## Nice-to-Have / Future

### 31. Dark/Light Mode Auto-Detection
- [ ] Detect system preference
- [ ] Remember user choice in localStorage

### 32. Keyboard Navigation
- [ ] Arrow keys to navigate between posts
- [ ] Keyboard shortcuts cheat sheet

### 33. Print Styles
- [ ] CSS for printing posts
- [ ] Clean, readable print layout

### 34. Newsletter/Email List
- [ ] Collect email subscribers
- [ ] Send digest of new posts
- [ ] Use Mailchimp, ConvertKit, or Supabase

### 35. Photo EXIF Data Display
**Why**: Show camera settings, location from photo metadata
- [ ] Extract EXIF data from uploads
- [ ] Display camera, settings, date, GPS
- [ ] Great for photography-focused posts

## Prioritization Guide

**Start Here (Critical):**
1. Infinite Scroll (#1)
2. Search Debouncing (#2)

**Next (Core Features):**
3. Category System (#3)
4. Rich Text Editor (#6)
5. Comments (#10)

**Then (Enhanced UX):**
6. Multiple Images (#7)
7. Related Posts (#14)
8. About Page (#24)

**Later (Engagement):**
9. Likes/Reactions (#11)
10. Share Buttons (#15)
11. Map View (#22) - Unique to travel blog!

**Polish:**
12. SEO (#29)
13. Analytics (#18)
14. PWA (#27)
