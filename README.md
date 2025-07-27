# **J²Adventures: A Full-Stack Travel Blog** 🦫

This project is a full-stack monorepo for a travel blog, featuring a React frontend and a Hono backend powered by Bun.

-----

## **Tech Stack & Structure**

  * **Core:** Bun, Hono, Vite, React, TypeScript
  * **Database:** Supabase (PostgreSQL)
  * **Styling:** Tailwind CSS
  * **Structure:** Monorepo with `client`, `server`, and `shared` workspaces.

-----

## **Getting Started**

### **1. Environment Setup**

Bun loads environment variables automatically. Create a `.env` file inside the `/server` directory.

**File: `server/.env`**

```env
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
```

> **Note:** Bun has native support for `.env` files. Packages like `dotenv` are not needed and should be removed to avoid conflicts.

### **2. Installation & Development**

```bash
# Install all dependencies
bun install

# Run client, server, and shared packages concurrently
bun run dev
```

If you encounter a port-in-use error (`EADDRINUSE`), stop the server and run `lsof -i :3000` (macOS/Linux) to find the Process ID (PID) of the old process, then stop it with `kill -9 <PID>`.

-----

## **Backend API Development**

The Hono server connects to Supabase and exposes API endpoints.

**File: `server/src/index.ts`**

```typescript
import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";

const app = new Hono();

// Initialize Supabase client (reads from server/.env)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);

// Get all posts
app.get("/api/posts", async (c) => {
  const { data, error } = await supabase.from("posts").select("*");
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// Create a new post
app.post("/api/posts", async (c) => {
  const postData = await c.req.json();
  const { data, error } = await supabase.from("posts").insert(postData).select();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data, 201);
});

export default app;
```

### **API Testing**

Test endpoints directly using a tool like `curl` before connecting the frontend.

```bash
# Example: Create a new post
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"title": "My Test Post", "type": "standard"}' \
  http://localhost:3000/api/posts
```

-----

## **Supabase Database**

### **Schema**

The database includes `posts` and `profiles` tables. The `posts` table stores blog content, and the `profiles` table extends Supabase's `auth.users` with public data. A trigger automatically creates a new user profile upon signup.

### **Row Level Security (RLS)**

RLS is enabled by default to secure your data. This means all access is blocked until you create specific permission policies.

#### **Development Policy (Insecure)**

To get unblocked during early development, allow anyone to insert posts. Run this in the Supabase SQL Editor:

```sql
-- Allows anyone to create posts. DEV USE ONLY.
CREATE POLICY "Allow anyone to create posts (DEV ONLY)"
ON public.posts FOR INSERT WITH CHECK (true);
```

#### **Production Policy (Secure)**

When you're ready for user authentication, replace the dev policy with a secure one.

```sql
-- 1. Remove the insecure policy
DROP POLICY "Allow anyone to create posts (DEV ONLY)" ON public.posts;

-- 2. Add the secure policy for logged-in users
CREATE POLICY "Allow authenticated users to create posts"
ON public.posts FOR INSERT TO authenticated WITH CHECK (true);
```
## Directory tree: 

client
├── dist
│   ├── assets
│   │   ├── index-D9db4s3f.css
│   │   └── index-gHj7llrS.js
│   ├── index.html
│   └── vite.svg
├── eslint.config.js
├── index.html
├── package.json
├── public
│   └── vite.svg
├── README.md
├── src
│   ├── assets
│   │   └── beaver.svg
│   ├── components
│   │   ├── About.tsx
│   │   ├── Contact.tsx
│   │   └── Home.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── wrangler.json
server
├── bun.lock
├── dist
│   ├── client.d.ts
│   ├── client.js
│   ├── index.d.ts
│   ├── index.js
│   ├── src
│   │   ├── client.d.ts
│   │   ├── client.js
│   │   ├── index.d.ts
│   │   └── index.js
│   └── tsconfig.tsbuildinfo
├── package.json
├── README.md
├── src
│   ├── client.ts
│   └── index.ts
├── tsconfCop2.json
├── tsconfCop.json
├── tsconfig.json
└── wrangler.jso
shared
├── dist
│   ├── index.d.ts
│   ├── index.js
│   ├── src
│   │   ├── index.d.ts
│   │   ├── index.js
│   │   └── types
│   │       ├── index.d.ts
│   │       └── index.js
│   ├── tsconfig.tsbuildinfo
│   └── types
│       ├── index.d.ts
│       └── index.js
├── packaCop.json
├── package.json
├── src
│   ├── index.ts
│   └── types
│       └── index.ts
├── tsconfCop2.json
└── tsconfig.json

35 directories, 183 files
