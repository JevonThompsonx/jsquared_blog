# Deployment Guide

This guide covers deploying J²Adventures Blog to production using Vercel (frontend) and Cloudflare Workers (backend).

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Cloudflare    │     │     Vercel      │     │    Supabase     │
│   (DNS/Domain)  │────▶│   (Frontend)    │────▶│   (Database +   │
│                 │     │   React SPA     │     │    Storage)     │
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

## 1. Supabase Setup (Already Done)

Your Supabase project should have:
- `posts`, `post_images`, `profiles`, `comments`, `comment_likes` tables
- Storage bucket: `jsquared_blog`
- Row Level Security (RLS) configured
- Auth enabled

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

---

## 3. Deploy Frontend to Vercel

### Prerequisites
- Vercel account
- GitHub repository connected

### Steps

1. **Connect Repository:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository

2. **Configure Build Settings:**
   | Setting | Value |
   |---------|-------|
   | Framework Preset | Vite |
   | Root Directory | `client` |
   | Build Command | `bun run build` |
   | Output Directory | `dist` |

3. **Add Environment Variables:**
   | Variable | Value |
   |----------|-------|
   | `VITE_SUPABASE_URL` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

4. **Deploy** - Vercel auto-deploys on every push to `main`

---

## 4. Connect Custom Domain (Cloudflare)

### For Frontend (Vercel)

1. **In Vercel:**
   - Go to your project → Settings → Domains
   - Add your domain (e.g., `jsquared.adventures.com`)

2. **In Cloudflare DNS:**
   | Type | Name | Target | Proxy |
   |------|------|--------|-------|
   | CNAME | `@` or `www` | `cname.vercel-dns.com` | DNS only (gray cloud) |

   > **Note:** Use "DNS only" (not proxied) for Vercel domains

### For Backend API (Optional subdomain)

If you want a custom API subdomain like `api.yourdomain.com`:

1. **In Cloudflare DNS:**
   | Type | Name | Target | Proxy |
   |------|------|--------|-------|
   | CNAME | `api` | `jsquared-blog-api.workers.dev` | Proxied (orange cloud) |

2. **Update frontend** to use the new API URL

---

## 5. Update API URL in Frontend

If using a custom API domain, update `client/src/config.ts` or environment:

```typescript
// For development
const API_URL = 'http://127.0.0.1:8787';

// For production
const API_URL = 'https://api.yourdomain.com';
```

Or use the Vercel rewrites in `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-worker.workers.dev/api/:path*"
    }
  ]
}
```

---

## 6. Scheduled Scripts & Maintenance

### Storage Cleanup Script

Run manually to remove orphaned images:
```bash
cd server
bun run src/cleanup-storage.ts
```

### Options for Scheduled Tasks

**Option A: GitHub Actions (Free)**

Create `.github/workflows/cleanup.yml`:
```yaml
name: Storage Cleanup
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday midnight
  workflow_dispatch:  # Manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: cd server && bun install
      - run: cd server && bun run src/cleanup-storage.ts
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

**Option B: Cloudflare Workers Cron Triggers (Free)**

Add to `server/wrangler.toml`:
```toml
[triggers]
crons = ["0 0 * * 0"]  # Weekly on Sunday
```

Then handle in worker:
```typescript
export default {
  async scheduled(event, env, ctx) {
    // Run cleanup logic
  }
}
```

---

## 7. Environment Variables Summary

### Client (Vercel)
| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

### Server (Cloudflare Workers)
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |

### Local Development
Create `server/.env`:
```
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGc..."
```

---

## 8. Deployment Checklist

- [ ] Supabase tables and RLS configured
- [ ] Backend deployed to Cloudflare Workers
- [ ] Backend secrets configured (SUPABASE_URL, SUPABASE_ANON_KEY)
- [ ] Frontend deployed to Vercel
- [ ] Frontend environment variables set
- [ ] Custom domain added to Vercel
- [ ] Cloudflare DNS configured (CNAME to Vercel)
- [ ] SSL certificate active (automatic with Cloudflare/Vercel)
- [ ] Test login/signup flow
- [ ] Test image uploads
- [ ] Test post creation/deletion

---

## Troubleshooting

### CORS Errors
Ensure your Cloudflare Worker has proper CORS headers for your Vercel domain.

### Images Not Loading
Check Supabase Storage bucket permissions - should allow public read access.

### Auth Not Working
Verify Supabase Auth settings and that the anon key is correct.

### Build Failures
Check that all dependencies are installed and TypeScript types are correct:
```bash
bun install
bun run build
```
