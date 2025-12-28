# J²Adventures Blog - Project Tracker

> **Last Updated**: December 28, 2025 | **Version**: 0.4.0

---

## 📋 Quick Reference

| Component | Technology | Status |
|-----------|------------|--------|
| Frontend | React 19 + Vite + TailwindCSS 4 | ✅ Deployed |
| Backend | Hono (Cloudflare Worker) | ✅ Deployed |
| Database | Supabase PostgreSQL | ✅ Configured |
| Auth | Supabase Auth | ✅ Working |
| Storage | Supabase Storage (WebP) | ✅ Working |
| Deployment | Cloudflare Pages + Workers | ✅ Live |

---

## ✅ Completed Features

### Core Infrastructure
- [x] Bun workspace monorepo (client/server/shared)
- [x] TypeScript project references for type safety
- [x] Supabase integration (Auth, DB, Storage)
- [x] Cloudflare deployment pipeline
- [x] Environment variable configuration

### Performance & Pagination
- [x] Infinite scroll with Intersection Observer
- [x] Server-side pagination (`limit`, `offset`, `hasMore`)
- [x] Search debouncing (400ms delay)
- [x] Server-side search (title, description, category)
- [x] Cache-Control headers (5 min CDN caching)

### Grid Layout & Design
- [x] CSS `grid-flow-dense` for gap-free layouts
- [x] Pattern-based layout randomization (6-post cycle)
- [x] Three layout types: horizontal (2-col), vertical, hover
- [x] Responsive grid (2/3/4 columns by screen)
- [x] Four theme options (dark/light variants)

### Categories System
- [x] 15 predefined travel categories
- [x] Custom category support ("Other" option)
- [x] Category pages with infinite scroll (`/category/:name`)
- [x] Clickable category badges on all post cards

### Image Handling
- [x] Automatic WebP conversion (85% quality)
- [x] Supabase Storage bucket (`jsquared_blog`)
- [x] Smart file naming with timestamps
- [x] Old image cleanup on replacement
- [x] URL paste + file upload options

### Admin Features
- [x] Role-based access control (admin/viewer)
- [x] Create/Edit/Delete posts
- [x] Shuffle layouts button
- [x] Image upload with category dropdown

### SEO
- [x] robots.txt + dynamic sitemap.xml
- [x] Open Graph + Twitter Card meta tags
- [x] JSON-LD structured data (Organization, BlogPosting, Breadcrumbs)
- [x] Proper heading hierarchy (h1 → h2 → h3)
- [x] Canonical URLs
- [x] 404 page with adventure theme

### Database Seeding
- [x] 20 starter posts with diverse categories
- [x] High-quality Unsplash images
- [x] Mixed layout types
- [x] Run with: `cd server && bun run seed`

---

## 🚧 In Progress / Next Up

### High Priority (Do These First)

| Feature | Effort | Notes |
|---------|--------|-------|
| Rich Text Editor | Medium | Replace textarea with Tiptap/Lexical |
| Comments System | Medium | `comments` table already planned |
| Draft Posts | Easy | Add `status` field (draft/published) |
| Multiple Images | Medium | Gallery component needed |

### Medium Priority

| Feature | Effort | Notes |
|---------|--------|-------|
| Related Posts | Easy | Match by category at post bottom |
| Author Profiles | Medium | `/author/:username` pages |
| About Page | Easy | Tell J² story |
| Share Buttons | Easy | Twitter, Facebook, copy link |
| Reading Time | Easy | Calculate from content length |
| Breadcrumbs | Easy | Home → Category → Post |

### Lower Priority (Polish)

| Feature | Effort | Notes |
|---------|--------|-------|
| Map View 🗺️ | High | Unique differentiator! Add location field |
| Likes/Reactions | Medium | `post_likes` table |
| Post Analytics | Medium | Track view counts |
| RSS Feed | Easy | `/feed.xml` endpoint |
| PWA Support | Medium | Service worker + manifest |
| Newsletter | Medium | Mailchimp/ConvertKit integration |

---

## 💡 Quick Wins (< 1 hour each)

- [ ] "Back to Top" button on long pages
- [ ] Loading skeleton for post cards
- [ ] Post count on category page headers
- [ ] Confirmation dialog before deleting posts
- [ ] Show image file size before upload
- [ ] Date formatting options
- [ ] Dark mode UI toggle

---

## 🏗️ Architecture Notes

### API Endpoints

```
GET  /api/posts          - Paginated posts (?limit, ?offset, ?search)
GET  /api/posts/:id      - Single post
POST /api/posts          - Create post (admin)
PUT  /api/posts/:id      - Update post (admin)
DELETE /api/posts/:id    - Delete post (admin)
GET  /sitemap.xml        - Dynamic sitemap
```

### Frontend Routes

```
/                    - Home (public)
/auth                - Login/signup
/admin               - Admin dashboard (admin only)
/posts/:id           - Post detail (public)
/posts/:id/edit      - Edit post (admin only)
/category/:category  - Category page (public)
/*                   - 404 page
```

### Database Schema

```sql
posts: id, created_at, title, description, image_url, category, author_id, type
profiles: id (FK auth.users), username, role
comments: id, created_at, content, post_id, user_id  -- planned
```

### Key Files

| File | Purpose |
|------|---------|
| `server/src/index.ts` | API routes, pagination, WebP conversion |
| `server/src/middleware/auth.ts` | JWT verification |
| `client/src/main.tsx` | Routing, themes |
| `client/src/context/AuthContext.tsx` | Auth state |
| `client/src/hooks/useDebounce.ts` | Search debouncing |
| `client/src/components/Home.tsx` | Homepage + infinite scroll |
| `client/src/components/SEO.tsx` | Meta tags + structured data |
| `shared/src/types/index.ts` | Shared TypeScript types |

---

## 📊 Storage & Limits

### Supabase Free Tier
- **Storage**: 1GB (~3,300-10,000 images at 100-300KB each)
- **Bandwidth**: 2GB/month (~6,500-20,000 image loads)
- **Current Format**: WebP @ 85% quality

### When to Upgrade
- Approaching 800MB storage usage
- Hitting bandwidth limits consistently
- **Supabase Pro**: $25/month → 8GB storage + 50GB bandwidth

---

## 🛠️ Development Commands

```bash
# Install dependencies
bun install

# Start full stack dev server
bun run dev

# Individual services
cd client && bun run dev          # Frontend only
bunx wrangler dev --config server/wrangler.toml  # Backend only
cd shared && bun run dev          # Types watch mode

# Build
bun run build                     # Full monorepo build
bun run build:client              # Frontend only
bun run build:server              # Backend only

# Seed database
cd server && bun run seed

# Deploy
cd server && bunx wrangler deploy  # Backend to Workers
# Frontend: Push to GitHub → Cloudflare Pages auto-deploys
```

### Environment Files

**`client/.env`**
```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

**`server/.dev.vars`** (local dev)
```
SUPABASE_URL="your_url"
SUPABASE_ANON_KEY="your_key"
```

---

## 🎯 Feature Roadmap

### Phase 1: Content Creation (Current Focus)
- Rich text editor
- Draft/publish workflow
- Multiple images per post

### Phase 2: Engagement
- Comments system
- Likes/reactions
- Share buttons
- Related posts

### Phase 3: Discovery
- Advanced search (date range, filters)
- Tag system (in addition to categories)
- Map view with adventure locations
- RSS feed

### Phase 4: Polish
- PWA offline support
- Analytics dashboard
- Newsletter integration
- Author profiles + About page

---

## 📝 Notes

- Images auto-convert to WebP for optimal performance
- Grid uses 6-post pattern cycle for visual variety
- Auth uses Supabase JWT with role checking
- Vite proxies `/api/*` to Wrangler in dev mode
- All posts use lazy loading for images

---

## 🔗 Resources

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Cloudflare Workers](https://dash.cloudflare.com)
- [Hono Docs](https://hono.dev)
- [TailwindCSS 4](https://tailwindcss.com)
