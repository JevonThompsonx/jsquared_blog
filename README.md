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
├── node_modules
│   └── typescript
│       ├── bin
│       │   ├── tsc
│       │   └── tsserver
│       ├── lib
│       │   ├── cancellationToken.js
│       │   ├── cs
│       │   │   └── diagnosticMessages.generated.json
│       │   ├── de
│       │   │   └── diagnosticMessages.generated.json
│       │   ├── es
│       │   │   └── diagnosticMessages.generated.json
│       │   ├── fr
│       │   │   └── diagnosticMessages.generated.json
│       │   ├── it
│       │   │   └── diagnosticMessages.generated.json
│       │   ├── ja
│       │   │   └── diagnosticMessages.generated.json
│       │   ├── ko
│       │   │   └── diagnosticMessages.generated.json
│       │   ├── lib.decorators.d.ts
│       │   ├── lib.decorators.legacy.d.ts
│       │   ├── lib.dom.asynciterable.d.ts
│       │   ├── lib.dom.d.ts
│       │   ├── lib.dom.iterable.d.ts
│       │   ├── lib.d.ts
│       │   ├── lib.es2015.collection.d.ts
│       │   ├── lib.es2015.core.d.ts
│       │   ├── lib.es2015.d.ts
│       │   ├── lib.es2015.generator.d.ts
│       │   ├── lib.es2015.iterable.d.ts
│       │   ├── lib.es2015.promise.d.ts
│       │   ├── lib.es2015.proxy.d.ts
│       │   ├── lib.es2015.reflect.d.ts
│       │   ├── lib.es2015.symbol.d.ts
│       │   ├── lib.es2015.symbol.wellknown.d.ts
│       │   ├── lib.es2016.array.include.d.ts
│       │   ├── lib.es2016.d.ts
│       │   ├── lib.es2016.full.d.ts
│       │   ├── lib.es2016.intl.d.ts
│       │   ├── lib.es2017.arraybuffer.d.ts
│       │   ├── lib.es2017.date.d.ts
│       │   ├── lib.es2017.d.ts
│       │   ├── lib.es2017.full.d.ts
│       │   ├── lib.es2017.intl.d.ts
│       │   ├── lib.es2017.object.d.ts
│       │   ├── lib.es2017.sharedmemory.d.ts
│       │   ├── lib.es2017.string.d.ts
│       │   ├── lib.es2017.typedarrays.d.ts
│       │   ├── lib.es2018.asyncgenerator.d.ts
│       │   ├── lib.es2018.asynciterable.d.ts
│       │   ├── lib.es2018.d.ts
│       │   ├── lib.es2018.full.d.ts
│       │   ├── lib.es2018.intl.d.ts
│       │   ├── lib.es2018.promise.d.ts
│       │   ├── lib.es2018.regexp.d.ts
│       │   ├── lib.es2019.array.d.ts
│       │   ├── lib.es2019.d.ts
│       │   ├── lib.es2019.full.d.ts
│       │   ├── lib.es2019.intl.d.ts
│       │   ├── lib.es2019.object.d.ts
│       │   ├── lib.es2019.string.d.ts
│       │   ├── lib.es2019.symbol.d.ts
│       │   ├── lib.es2020.bigint.d.ts
│       │   ├── lib.es2020.date.d.ts
│       │   ├── lib.es2020.d.ts
│       │   ├── lib.es2020.full.d.ts
│       │   ├── lib.es2020.intl.d.ts
│       │   ├── lib.es2020.number.d.ts
│       │   ├── lib.es2020.promise.d.ts
│       │   ├── lib.es2020.sharedmemory.d.ts
│       │   ├── lib.es2020.string.d.ts
│       │   ├── lib.es2020.symbol.wellknown.d.ts
│       │   ├── lib.es2021.d.ts
│       │   ├── lib.es2021.full.d.ts
│       │   ├── lib.es2021.intl.d.ts
│       │   ├── lib.es2021.promise.d.ts
│       │   ├── lib.es2021.string.d.ts
│       │   ├── lib.es2021.weakref.d.ts
│       │   ├── lib.es2022.array.d.ts
│       │   ├── lib.es2022.d.ts
│       │   ├── lib.es2022.error.d.ts
│       │   ├── lib.es2022.full.d.ts
│       │   ├── lib.es2022.intl.d.ts
│       │   ├── lib.es2022.object.d.ts
│       │   ├── lib.es2022.regexp.d.ts
│       │   ├── lib.es2022.string.d.ts
│       │   ├── lib.es2023.array.d.ts
│       │   ├── lib.es2023.collection.d.ts
│       │   ├── lib.es2023.d.ts
│       │   ├── lib.es2023.full.d.ts
│       │   ├── lib.es2023.intl.d.ts
│       │   ├── lib.es2024.arraybuffer.d.ts
│       │   ├── lib.es2024.collection.d.ts
│       │   ├── lib.es2024.d.ts
│       │   ├── lib.es2024.full.d.ts
│       │   ├── lib.es2024.object.d.ts
│       │   ├── lib.es2024.promise.d.ts
│       │   ├── lib.es2024.regexp.d.ts
│       │   ├── lib.es2024.sharedmemory.d.ts
│       │   ├── lib.es2024.string.d.ts
│       │   ├── lib.es5.d.ts
│       │   ├── lib.es6.d.ts
│       │   ├── lib.esnext.array.d.ts
│       │   ├── lib.esnext.collection.d.ts
│       │   ├── lib.esnext.decorators.d.ts
│       │   ├── lib.esnext.disposable.d.ts
│       │   ├── lib.esnext.d.ts
│       │   ├── lib.esnext.full.d.ts
│       │   ├── lib.esnext.intl.d.ts
│       │   ├── lib.esnext.iterator.d.ts
│       │   ├── lib.scripthost.d.ts
│       │   ├── lib.webworker.asynciterable.d.ts
│       │   ├── lib.webworker.d.ts
│       │   ├── lib.webworker.importscripts.d.ts
│       │   ├── lib.webworker.iterable.d.ts
│       │   ├── pl
│       │   │   └── diagnosticMessages.generated.json
│       │   ├── pt-br
│       │   │   └── diagnosticMessages.generated.json
│       │   ├── ru
│       │   │   └── diagnosticMessages.generated.json
│       │   ├── tr
│       │   │   └── diagnosticMessages.generated.json
│       │   ├── _tsc.js
│       │   ├── tsc.js
│       │   ├── _tsserver.js
│       │   ├── tsserver.js
│       │   ├── tsserverlibrary.d.ts
│       │   ├── tsserverlibrary.js
│       │   ├── typescript.d.ts
│       │   ├── typescript.js
│       │   ├── typesMap.json
│       │   ├── _typingsInstaller.js
│       │   ├── typingsInstaller.js
│       │   ├── watchGuard.js
│       │   ├── zh-cn
│       │   │   └── diagnosticMessages.generated.json
│       │   └── zh-tw
│       │       └── diagnosticMessages.generated.json
│       ├── LICENSE.txt
│       ├── package.json
│       ├── README.md
│       ├── SECURITY.md
│       └── ThirdPartyNoticeText.txt
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
