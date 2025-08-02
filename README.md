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