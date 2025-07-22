## **Phase 1: Backend and Infrastructure Setup** 🏗️

The first step is to set up a robust backend service that handles your database, user authentication, and file storage. **Supabase** is an excellent choice as it's a PostgreSQL-based "Backend as a Service" that provides all these features for free and works seamlessly with Hono.

1.  **Create a Supabase Project:**

      * Go to [supabase.com](https://supabase.com), create an account, and start a new project.
      * You'll get a Project URL and an `anon` key. Keep these handy; you'll need them to connect your Hono app.

2.  **Design Your Database Schema:**

      * In the Supabase dashboard, go to the **Table Editor**.
      * Create the following tables:
          * **`posts`**: This will replace your mock data array.
              * Columns: `id` (PK, auto-generated), `created_at` (auto-generated), `title` (text), `description` (text), `image_url` (text), `category` (text), `author_id` (FK to `auth.users`), `type` (text, e.g., "split-vertical"), `gridClass` (text).
          * **`comments`**: To store user comments.
              * Columns: `id` (PK), `created_at`, `content` (text), `post_id` (FK to `posts`), `user_id` (FK to `auth.users`).
          * **Note:** Supabase automatically creates a `users` table in the `auth` schema when users sign up. You don't need to create it manually.

3.  **Set Up User Roles:**

      * Create a `profiles` table to store public user data and roles.
          * Columns: `id` (PK, FK to `auth.users`), `username` (text), `role` (text, default: 'viewer').
      * After creating the admin accounts for yourself, Jevon, and Princess, you can manually update their `role` in this table to `admin`.

4.  **Set Up Media Storage (Supabase Storage):**

      * Go to the **Storage** section in Supabase.
      * Create a new **bucket** called `post-images`.
      * Set access policies for this bucket. A good starting point is to allow public reads (`SELECT`) but restrict uploads (`INSERT`, `UPDATE`) to authenticated users. This is done via Row Level Security (RLS) policies.

-----

## **Phase 2: API Development (Hono Backend)** ⚙️

Now, you'll extend your Hono server to communicate with Supabase.

1.  **Connect Hono to Supabase:**

      * Install the Supabase client in your `server` package: `bun add @supabase/supabase-js`.
      * Create environment variables (`.env`) in the `server/` directory for your Supabase URL and key.
      * Your `server/src/index.ts` will now be responsible for defining the API routes that the frontend will call.

2.  **Create API Endpoints:**

      * **Posts:**
          * `GET /api/posts`: Fetch all posts for the homepage.
          * `POST /api/posts`: Create a new post (protected route, only for `admin` roles).
          * `PUT /api/posts/:id`: Update an existing post (protected).
          * `DELETE /api/posts/:id`: Delete a post (protected).
      * **Comments:**
          * `GET /api/posts/:id/comments`: Fetch all comments for a specific post.
          * `POST /api/posts/:id/comments`: Add a new comment (protected, requires user to be logged in).
      * **Authentication:** Supabase's client library will handle most of the user login/signup flow, but your backend will need middleware to protect certain routes by verifying the user's JWT (provided by Supabase).

3.  **Update Shared Types:**

      * In your `shared/` package, expand your types to reflect the database schema. This ensures end-to-end type safety.

    <!-- end list -->

    ```typescript
    // In shared/src/index.ts
    export type Post = {
      id: number;
      created_at: string;
      title: string;
      description: string;
      image_url: string;
      // ... other fields
    };

    export type Comment = {
      id: number;
      content: string;
      // ... etc.
    };
    ```

-----

## **Phase 3: Frontend Integration (React Client)** 🎨

Next, modify your React app to fetch data from your new API instead of using mock data.

1.  **Data Fetching:**

      * Remove the `allArticles` mock data array.
      * In your `Home` component, use the `useEffect` hook to fetch posts from your `GET /api/posts` endpoint when the component mounts.
      * Update the `loadMoreArticles` function to make paginated API calls instead of slicing an array. The API should accept `page` and `limit` query parameters.

2.  **Authentication Flow:**

      * Create new pages/routes for `Login`, `Signup`, and an `AdminDashboard`.
      * Use a state management solution like **React Context** to manage the user's authentication state globally. A `useAuth` hook is a great pattern here.
      * The login page will use the `supabase-js` client to sign the user in. Once successful, the auth context is updated, and the app re-renders, showing protected UI elements (like a "Logout" or "Create Post" button).

3.  **Content Creation:**

      * Build a new component, `PostEditor.tsx`, which contains a form for creating and editing posts.
      * This form will include an input of `type="file"` for the image upload. When a user selects a file, you'll use the `supabase-js` client to upload it to your `post-images` storage bucket. On success, Supabase provides a URL that you save in your `posts` table.

4.  **Displaying Single Posts & Comments:**

      * Create a new page, like `PostPage.tsx`, that renders when a user clicks on an article card. It will fetch a single post's data from `/api/posts/:id`.
      * Below the post content, fetch and display comments from `/api/posts/:id/comments`.
      * Add a form that allows logged-in users to submit new comments. Conditionally render this form based on the user's login status from your auth context.

-----

## **Phase 4: Deployment** 🚀

With your app fully functional locally, it's time to deploy.

1.  **Backend (Hono):**

      * **Deploy to Cloudflare Workers.** It's built for edge environments, is incredibly fast, and integrates perfectly with Hono and your Cloudflare domain. The `bhv` starter is likely pre-configured for this.
      * Set your Supabase environment variables in the Cloudflare dashboard.

2.  **Frontend (React):**

      * **Deploy to Vercel or Cloudflare Pages.** Both offer seamless Git integration, automatic builds from your `client` directory, and a global CDN.

3.  **Domain & DNS:**

      * In your Cloudflare DNS settings:
          * Point your root domain (e.g., `j2adventures.com`) via a `CNAME` record to your frontend deployment (e.g., Vercel's URL).
          * Create a subdomain for your API, like **`api.j2adventures.com`**, and point its `CNAME` record to your deployed Cloudflare Worker URL.
      * **CORS:** Configure your Hono backend to accept requests from your frontend domain (`https://j2adventures.com`) to prevent Cross-Origin Resource Sharing errors.
