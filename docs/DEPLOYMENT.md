# Deployment Guide

This guide covers deploying J²Adventures Blog to production using Cloudflare Pages (frontend) and Cloudflare Workers (backend).

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Cloudflare    │     │   Cloudflare    │     │    Supabase     │
│   (DNS/Domain)  │────▶│     Pages       │────▶│   (Database +   │
│                 │     │   (Frontend)    │     │    Storage)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Cloudflare    │
                        │    Workers      │
                        │   (Backend)     │
                        └─────────────────┘
```

---

## 1. Supabase Setup

Your Supabase project should have:
- Tables: `posts`, `post_images`, `profiles`, `comments`, `comment_likes`, `tags`, `post_tags`
- Storage bucket: `jsquared_blog` (public read access)
- Row Level Security (RLS) configured
- Auth enabled

### Database Migrations
Run the combined migration in Supabase SQL Editor:
```sql
-- Copy contents from: server/migrations/APPLY_ALL_MIGRATIONS.sql
```

---

## 2. Deploy Backend to Cloudflare Workers

### Prerequisites
- Cloudflare account
- Wrangler CLI installed (`bun add -g wrangler`)

### Steps

1. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

2. **Configure secrets:**
   ```bash
   cd server
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_ANON_KEY
   ```

3. **Deploy:**
   ```bash
   wrangler deploy
   ```

4. **Note the Worker URL** (e.g., `https://jsquared-blog-api.your-subdomain.workers.dev`)

### Cron Job (Post Scheduling)
The backend includes a cron trigger that runs every 15 minutes to auto-publish scheduled posts:
```toml
# server/wrangler.toml
[triggers]
crons = ["*/15 * * * *"]
```

---

## 3. Deploy Frontend to Cloudflare Pages

### Steps

1. **Connect Repository:**
   - Go to Cloudflare Dashboard → Workers & Pages → Create Application → Pages
   - Connect your GitHub repository

2. **Configure Build Settings:**
   | Setting | Value |
   |---------|-------|
   | Framework Preset | Vite |
   | Build Command | `bun run build` |
   | Build Output Directory | `client/dist` |
   | Root Directory | `/` (leave blank) |

3. **Add Environment Variables:**
   | Variable | Value |
   |----------|-------|
   | `VITE_SUPABASE_URL` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

4. **Deploy** - Cloudflare Pages auto-deploys on every push to `main`

---

## 4. Connect Custom Domain

### For Frontend (Cloudflare Pages)

1. **In Cloudflare Pages project:**
   - Go to Settings → Custom Domains
   - Add your domain (e.g., `jsquaredadventures.com`)

2. **DNS is automatic** when domain is in the same Cloudflare account

### For Backend API (Optional subdomain)

If you want a custom API subdomain like `api.yourdomain.com`:

1. **In Cloudflare DNS:**
   | Type | Name | Target | Proxy |
   |------|------|--------|-------|
   | CNAME | `api` | `jsquared-blog-api.workers.dev` | Proxied (orange cloud) |

2. **Update Worker routing** in Cloudflare dashboard if needed

---

## 5. SPA Routing Configuration

The frontend uses client-side routing. Cloudflare Pages handles this via `_redirects`:

```
# client/public/_redirects
/*    /index.html   200
```

This ensures all routes serve the SPA and let React Router handle navigation.

---

## 6. Environment Variables Summary

### Client (Cloudflare Pages)
| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

### Server (Cloudflare Workers - Secrets)
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |

### Local Development
**Client** (`client/.env`):
```
VITE_SUPABASE_URL="https://xxx.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGc..."
```

**Server** (`server/.dev.vars`):
```
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGc..."
```

---

## 7. Deployment Checklist

### Initial Setup
- [ ] Supabase project created
- [ ] Database migrations applied
- [ ] RLS policies configured
- [ ] Storage bucket created with public read access

### Backend Deployment
- [ ] Wrangler logged in (`wrangler login`)
- [ ] Secrets configured (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
- [ ] Worker deployed (`wrangler deploy`)
- [ ] Worker URL noted for frontend config

### Frontend Deployment
- [ ] GitHub repo connected to Cloudflare Pages
- [ ] Build settings configured
- [ ] Environment variables set
- [ ] Build succeeds
- [ ] Custom domain configured (optional)

### Verification
- [ ] Homepage loads
- [ ] Login/signup works
- [ ] Image uploads work
- [ ] Post creation works (admin)
- [ ] Comments work
- [ ] Scheduled posts auto-publish (wait 15 min)

---

## 8. Troubleshooting

### CORS Errors
The Hono backend includes CORS middleware. Ensure your frontend domain is allowed:
```typescript
// server/src/index.ts
app.use('*', cors({
  origin: '*', // Or specific domains
  credentials: true,
}))
```

### Images Not Loading
1. Check Supabase Storage bucket is public
2. Verify bucket name is `jsquared_blog`
3. Check CORS settings in Supabase Storage

### Auth Not Working
1. Verify Supabase anon key is correct
2. Check Supabase Auth settings (allowed redirects)
3. Clear localStorage and try again

### Build Failures
```bash
# Clean install
rm -rf node_modules bun.lock
bun install

# Type check
bun run build
```

### Scheduled Posts Not Publishing
1. Cron triggers only work in production (not local dev)
2. Check Worker logs in Cloudflare dashboard
3. Posts also auto-publish on page request (fallback)

---

## 9. Monitoring & Logs

### Cloudflare Worker Logs
1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker
3. Click "Logs" tab
4. Enable real-time logs or view historical

### Cron Job Logs
Scheduled handler logs appear in the same Worker logs with `Cron trigger` prefix.

---

## 10. Updates & Redeployment

### Backend Updates
```bash
cd server
wrangler deploy
```

### Frontend Updates
Just push to the connected GitHub branch - Cloudflare Pages auto-deploys.

### Database Migrations
Run new migrations in Supabase SQL Editor, then deploy updated code.
