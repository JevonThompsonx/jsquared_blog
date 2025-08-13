# J²Adventures Blog

This is a monorepo for the J²Adventures blog, consisting of a React frontend, a Hono backend, and a shared types package.

## Project Structure

-   `client/`: React frontend application (Vite)
-   `server/`: Hono backend API
-   `shared/`: Shared types and utilities
-   `dist/`: Compiled output for the entire monorepo (from root build)

## Local Development

To run the project locally, ensure you have [Bun](https://bun.sh/docs/installation) installed.

1.  **Install Dependencies:**
    ```bash
    bun install
    ```
2.  **Set up Environment Variables:**
    Create a `.env` file in the `client/` directory with your Supabase credentials:
    ```
    # client/.env
    VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
    VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    ```
    Create a `.env` file in the `server/` directory with your Supabase credentials (for local development of the server):
    ```
    # server/.env
    SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
    SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    ```
3.  **Start Development Servers:**
    From the project root:
    ```bash
    bun run dev
    ```
    This command uses `concurrently` to start the development servers for `shared`, `server`, and `client`. The frontend will be accessible at `http://localhost:5173` (or another port if 5173 is in use).

## Cloudflare Images Setup for Optimized Image Delivery

This project leverages Cloudflare Images to provide optimized and fast image delivery, while using Supabase Storage as the primary storage for your original images. Cloudflare Images acts as a transformation and caching layer.

### Prerequisites

-   A Cloudflare account with Cloudflare Images enabled.

### Setup Steps

1.  **Ensure Supabase Storage Bucket is Public:**
    -   Go to your Supabase Dashboard.
    -   Navigate to **Storage** -> **Buckets**.
    -   Select your `post-images` bucket.
    -   Go to **Settings** and ensure "Public bucket" is **enabled**. Cloudflare Images needs public read access to fetch your original images.

2.  **Create a Cloudflare Images Variant with Custom Storage:**
    -   Go to your Cloudflare Dashboard.
    -   Navigate to **Images** -> **Variants**.
    -   Click **Add variant**.
    -   **Variant Name:** Choose a descriptive name (e.g., `supabase-original`, `webp-optimized`, `thumbnail`). This name will be part of your image URLs.
    -   **Source URL:** This is the base URL where Cloudflare Images will find your original images in Supabase Storage. It should look like this:
        `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/storage/v1/object/public/post-images/`
        -   Replace `<YOUR_SUPABASE_PROJECT_REF>` with your actual Supabase project reference (found in Supabase Dashboard -> **Project Settings** -> **General** -> **Project API keys**).
    -   **Delivery URL:** This is the URL Cloudflare Images will use to serve your images. It will look like:
        `https://imagedelivery.net/<YOUR_ACCOUNT_HASH>/<IMAGE_PATH_FROM_SUPABASE>/<VARIANT_NAME>`
        -   Your **Account Hash** is: `87WtOE5oSHkx54q2OsGN8w` (This is hardcoded in the client-side code for image delivery).
        -   `<IMAGE_PATH_FROM_SUPABASE>` is the filename/path you store in your Supabase `posts` table (e.g., `my-image.jpg`).
        -   `<VARIANT_NAME>` is the name of the variant you defined (e.g., `public`, `webp-optimized`).
    -   **Transformations:** Configure desired transformations (e.g., `Format: WebP`, `Quality: 80`, `Fit: cover`, `Width`, `Height`). These will be applied on the fly.

### How it Works in This Project

-   When you upload an image on the "Create Post" page, the original image file is stored in your Supabase `post-images` bucket.
-   The `image_url` field in your Supabase `posts` table now stores only the **path/filename** of the image within the bucket (e.g., `a1b2c3d4-e5f6-7890-1234-567890abcdef.jpg`), not the full Supabase public URL.
-   On the homepage, the frontend constructs the image `src` attribute using the Cloudflare Images delivery URL format, combining your Account Hash, the stored image path, and a chosen variant name (e.g., `/public` for the original size, or a custom variant for optimized versions). This allows Cloudflare Images to fetch, transform, and serve the image efficiently.

## Cloudflare Deployment

This project is configured for deployment to Cloudflare Pages (frontend) and Cloudflare Workers (backend API).

### Prerequisites

-   A Cloudflare account.
-   The `wrangler` CLI installed and configured (`bunx wrangler login`).

### 1. Build the Project

From the project root, run the unified build command:

```bash
bun run build
```

This will compile all workspaces (`shared`, `server`, `client`) and place their outputs in their respective `dist/` directories.

### 2. Deploy the Backend (Cloudflare Worker)

Your Hono backend (`server/`) is configured as a Cloudflare Worker.

1.  **Navigate to the server directory:**
    ```bash
    cd server
    ```
2.  **Deploy the Worker:**
    ```bash
    bunx wrangler deploy
    ```
    Wrangler will deploy your Worker and provide a URL (e.g., `your-worker-name.your-account.workers.dev`). Make a note of this URL.

3.  **Set Environment Variables (Secrets) in Cloudflare:**
    Go to your Cloudflare dashboard:
    -   Navigate to **Workers & Pages** -> **Overview** -> Your Worker (`jsquared-blog-api` by default).
    -   Go to **Settings** -> **Variables**.
    -   Add the following **Environment Variables (Secrets)**:
        -   `SUPABASE_URL` (your Supabase project URL)
        -   `SUPABASE_ANON_KEY` (your Supabase project Anon Key)

### 3. Deploy the Frontend (Cloudflare Pages)

Your React frontend (`client/`) will be deployed to Cloudflare Pages.

1.  **Create a New Pages Project:**
    -   Go to your Cloudflare dashboard: **Workers & Pages** -> **Overview** -> **Create application** -> **Pages** -> **Connect to Git**.
    -   Select your Git repository.

2.  **Configure Build Settings:**
    -   **Framework preset:** `React` (or `Vite`)
    -   **Build command:** `bun run build` (This command, run from the root, builds the entire monorepo.)
    -   **Build directory:** `client/dist` (This tells Pages where to find the static assets for your frontend.)

3.  **Set Environment Variables for Pages:**
    -   In the Pages project settings, go to **Environment variables**.
    -   Add the following variables (these are used during the frontend build process):
        -   `VITE_SUPABASE_URL` (your Supabase project URL)
        -   `VITE_SUPABASE_ANON_KEY` (your Supabase project Anon Key)

### 4. Connecting Frontend to Backend with a Custom Domain

To ensure your frontend can communicate with your backend Worker using a clean custom domain (e.g., `api.yourdomain.com`), follow these steps:

1.  **Add a Custom Domain to Cloudflare Pages:**
    -   In your Cloudflare Pages project settings, go to **Custom domains**.
    -   Follow the instructions to add your desired custom domain (e.g., `yourdomain.com`). Cloudflare will guide you through setting up the necessary DNS records.

2.  **Create a CNAME Record for your API Subdomain:**
    -   Once your custom domain is active on Pages, go to your Cloudflare DNS settings for `yourdomain.com`.
    -   Add a new `CNAME` record:
        -   **Type:** `CNAME`
        -   **Name:** `api` (or whatever subdomain you prefer for your API)
        -   **Target:** The URL of your deployed Cloudflare Worker (e.g., `your-worker-name.your-account.workers.dev`).
        -   **Proxy status:** `Proxied` (orange cloud)

    This will make your Worker accessible at `https://api.yourdomain.com`.

3.  **Update Frontend API Calls:**
    Currently, your frontend uses relative paths like `/api/posts`. For production deployment with a custom domain, you'll need to tell your frontend where your API lives.

    **Recommendation:** Use an environment variable in your frontend to define the API base URL.

    -   **In `client/.env` (for local development):**
        ```
        VITE_API_BASE_URL="http://localhost:3000"
        ```
    -   **In Cloudflare Pages Environment Variables (for production):**
        Add a new environment variable:
        ```
        VITE_API_BASE_URL="https://api.yourdomain.com"
        ```
    -   **Modify your frontend code (e.g., `client/src/components/Home.tsx` and `client/src/components/Admin.tsx`):**
        Change `fetch("/api/posts")` to `fetch(`${import.meta.env.VITE_API_BASE_URL}/api/posts")`.
        You'll need to apply this change wherever your frontend makes API calls to your backend.

---