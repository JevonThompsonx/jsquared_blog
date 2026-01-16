import { Hono } from "hono";
import { logger } from "hono/logger";
import { createClient, User, SupabaseClient } from "@supabase/supabase-js";
import { encode as encodeWebP } from "@jsquash/webp";
import { decode as decodeJPEG } from "@jsquash/jpeg";
import { decode as decodePNG } from "@jsquash/png";

import { authMiddleware } from "./middleware/auth"; // Import the new middleware

// Define the environment variables (Bindings) expected by the Worker
interface Bindings {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  DEV_MODE?: string;
}

// Cloudflare Workers types for scheduled events
interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// Define custom user type with role
interface UserWithRole extends User {
  role?: string;
}

// Define the Variables expected by the Worker
interface Variables {
  supabase: SupabaseClient<any, 'public', any>; // Explicitly type SupabaseClient
  user: UserWithRole;
}

// Define the Hono environment type
interface HonoEnv {
  Bindings: Bindings;
  Variables: Variables;
}

export type PostType = "split-horizontal" | "split-vertical" | "hover";

export type Post = {
  id: number;
  created_at: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  author_id: string;
  type: PostType; // Matches database column name
};

interface ApiResponse {
  message: string;
  success: boolean;
}

// Max file size for image uploads (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Set to false to disable WebP conversion (more reliable in dev, less CPU intensive)
const ENABLE_WEBP_CONVERSION = false;

// Helper to convert images to WebP format (or skip conversion if disabled)
async function convertToWebP(
  imageBuffer: ArrayBuffer,
  contentType: string
): Promise<{ buffer: ArrayBuffer; converted: boolean; extension: string }> {
  // Get the original extension
  const originalExt = contentType === 'image/jpeg' || contentType === 'image/jpg' ? 'jpg' :
                      contentType === 'image/png' ? 'png' :
                      contentType === 'image/webp' ? 'webp' :
                      contentType.split('/')[1] || 'bin';

  // If conversion is disabled or already WebP, return as-is
  if (!ENABLE_WEBP_CONVERSION || contentType === 'image/webp') {
    return { buffer: imageBuffer, converted: false, extension: originalExt };
  }

  try {
    let imageData;

    // Decode based on original format
    if (contentType === 'image/jpeg' || contentType === 'image/jpg') {
      imageData = await decodeJPEG(imageBuffer);
    } else if (contentType === 'image/png') {
      imageData = await decodePNG(imageBuffer);
    } else {
      // Unsupported format - return original with original extension
      console.warn(`Unsupported format ${contentType}, keeping original`);
      return { buffer: imageBuffer, converted: false, extension: originalExt };
    }

    // Encode to WebP with quality setting
    const webpBuffer = await encodeWebP(imageData, { quality: 85 });
    return { buffer: webpBuffer, converted: true, extension: 'webp' };
  } catch (error) {
    // If conversion fails, return original buffer - don't crash
    console.error('WebP conversion error (using original):', error);
    return { buffer: imageBuffer, converted: false, extension: originalExt };
  }
}

// Helper to upload image to Supabase Storage
async function uploadImageToSupabase(
  supabase: SupabaseClient,
  imageBuffer: ArrayBuffer,
  fileName: string,
  extension: string = 'webp'
): Promise<string> {
  const bucket = 'jsquared_blog';

  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const uniqueFileName = `${timestamp}-${fileName.replace(/\.[^/.]+$/, '')}.${extension}`;
  const contentType = extension === 'webp' ? 'image/webp' :
                      extension === 'jpg' ? 'image/jpeg' :
                      extension === 'png' ? 'image/png' : 'application/octet-stream';

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(uniqueFileName, imageBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error('Supabase Storage upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(uniqueFileName);

  return urlData.publicUrl;
}

// Helper to delete image from Supabase Storage
async function deleteImageFromSupabase(
  supabase: SupabaseClient,
  imageUrl: string
): Promise<void> {
  const bucket = 'jsquared_blog';

  // Extract filename from URL
  const urlParts = imageUrl.split('/');
  const fileName = urlParts[urlParts.length - 1];

  const { error } = await supabase.storage
    .from(bucket)
    .remove([fileName]);

  if (error) {
    console.error('Supabase Storage delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

// Seeded random number generator for consistent but varied layouts
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Grid-aware layout assignment that prevents gaps
function getRandomLayout(postIndex: number, totalPosts: number): { type: PostType; grid_class: string } {
  // Use post index as seed for consistent randomization
  const random = seededRandom(postIndex * 7 + totalPosts * 3);

  // Pattern-based assignment to work well with grid
  // We use a repeating pattern with some randomization to ensure good distribution
  const patternPosition = postIndex % 6;

  // Base pattern for every 6 posts (works well with 2, 3, 4 column grids):
  // [hover, horizontal, hover, vertical, hover, hover]
  // This gives us a good mix without too many consecutive 2-column items

  if (patternPosition === 1) {
    // Position 1: horizontal (2-column)
    return { type: "split-horizontal", grid_class: "md:col-span-2 row-span-1" };
  } else if (patternPosition === 3) {
    // Position 3: vertical
    return { type: "split-vertical", grid_class: "md:col-span-1 row-span-2" };
  } else {
    // All other positions: mix between hover and vertical based on random
    if (random < 0.6) {
      return { type: "hover", grid_class: "md:col-span-1 row-span-1" };
    } else {
      return { type: "split-vertical", grid_class: "md:col-span-1 row-span-2" };
    }
  }
}

async function reassignAllPostLayouts(
  supabase: SupabaseClient<any, 'public', any>,
  _layoutPatterns: { type: PostType; grid_class: string }[]
) {
  const { data: allPosts, error: fetchAllError } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (fetchAllError) {
    console.error("Error fetching all posts for re-assignment:", fetchAllError);
    return;
  }

  if (!allPosts || allPosts.length === 0) {
    return;
  }

  const updates = allPosts.map((post, index) => {
    const layout = getRandomLayout(index, allPosts.length);

    return {
      ...post,
      type: layout.type,
      grid_class: layout.grid_class,
    };
  });

  // Perform batch updates
  const { error: updateError } = await supabase
    .from("posts")
    .upsert(updates, { onConflict: "id" });

  if (updateError) {
    console.error("Error updating all posts with new layouts:", updateError);
  }
}

const app = new Hono<HonoEnv>(); // Use the explicit HonoEnv

// --- MIDDLEWARE ---
app.use("*", logger());

// --- PUBLIC ROUTES (No Auth Required) ---
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/hello", async (c) => {
  const data: ApiResponse = {
    message: "Hello BHVR!",
    success: true,
  };
  return c.json(data, { status: 200 });
});

// Sitemap.xml endpoint for SEO
app.get("/sitemap.xml", async (c) => {
  const supabase = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_ANON_KEY,
  );

  // Fetch all posts
  const { data: posts } = await supabase
    .from("posts")
    .select("id, created_at")
    .order("created_at", { ascending: false });

  const baseUrl = "https://jsquaredadventures.com";
  const currentDate = new Date().toISOString().split('T')[0];

  // Build XML sitemap
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Posts -->`;

  if (posts && posts.length > 0) {
    posts.forEach(post => {
      const postDate = new Date(post.created_at).toISOString().split('T')[0];
      xml += `
  <url>
    <loc>${baseUrl}/posts/${post.id}</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });
  }

  xml += `
</urlset>`;

  return c.text(xml, 200, {
    "Content-Type": "application/xml",
    "Cache-Control": "public, max-age=3600", // Cache for 1 hour
  });
});

// RSS Feed endpoint
app.get("/feed.xml", async (c) => {
  const supabase = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_ANON_KEY,
  );

  // Fetch published posts with full details
  const { data: posts } = await supabase
    .from("posts")
    .select("id, created_at, title, description, category, image_url")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20);

  const baseUrl = "https://jsquaredadventures.com";
  const buildDate = new Date().toUTCString();

  // Helper to strip HTML tags for RSS description
  const stripHtml = (html: string | null): string => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").substring(0, 300);
  };

  // Helper to escape XML special characters
  const escapeXml = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>J²Adventures</title>
    <link>${baseUrl}</link>
    <description>Join us on our adventures around the world! From hiking and camping to food tours and city explorations, we share our travel stories and experiences.</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/og-image.jpg</url>
      <title>J²Adventures</title>
      <link>${baseUrl}</link>
    </image>`;

  if (posts && posts.length > 0) {
    posts.forEach(post => {
      const pubDate = new Date(post.created_at).toUTCString();
      const description = escapeXml(stripHtml(post.description));
      const title = escapeXml(post.title || "Untitled");

      rss += `
    <item>
      <title>${title}</title>
      <link>${baseUrl}/posts/${post.id}</link>
      <guid isPermaLink="true">${baseUrl}/posts/${post.id}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}${description.length >= 300 ? '...' : ''}</description>${post.category ? `
      <category>${escapeXml(post.category)}</category>` : ''}${post.image_url ? `
      <enclosure url="${escapeXml(post.image_url)}" type="image/webp"/>` : ''}
    </item>`;
    });
  }

  rss += `
  </channel>
</rss>`;

  return c.text(rss, 200, {
    "Content-Type": "application/rss+xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600", // Cache for 1 hour
  });
});

app.get("/api/posts", async (c) => {
  // Create a temporary, public client for this route using c.env
  const supabase = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_ANON_KEY,
  );

  // Auto-publish scheduled posts that are past their scheduled time
  // This is a query-time check that runs on each request
  const now = new Date().toISOString();
  const { data: scheduledPosts } = await supabase
    .from("posts")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_for", now);

  if (scheduledPosts && scheduledPosts.length > 0) {
    // Auto-publish these posts
    for (const post of scheduledPosts) {
      await supabase
        .from("posts")
        .update({
          status: "published",
          published_at: now,
          scheduled_for: null, // Clear the scheduled time
        })
        .eq("id", post.id);
    }
    console.log(`Auto-published ${scheduledPosts.length} scheduled post(s)`);
  }

  // Check if user is authenticated and is an admin
  let isAdmin = false;
  const authHeader = c.req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const authenticatedSupabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    );

    const { data: { user } } = await authenticatedSupabase.auth.getUser();

    if (user) {
      // Check user role from profiles table
      const { data: profile } = await authenticatedSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      isAdmin = profile?.role === "admin";
    }
  }

  // Get pagination parameters from query string
  const limit = parseInt(c.req.query("limit") || "20", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const search = c.req.query("search") || "";
  const statusFilter = c.req.query("status") || ""; // Optional status filter for admins

  // Validate limit (max 100 posts per request)
  const validLimit = Math.min(Math.max(limit, 1), 100);

  // Build query with pagination
  let query = supabase
    .from("posts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + validLimit - 1);

  // Filter by status
  if (!isAdmin) {
    // Non-admins can only see published posts (not drafts or scheduled)
    query = query.eq("status", "published");
  } else if (statusFilter === "draft") {
    // Admin requesting drafts only
    query = query.eq("status", "draft");
  } else if (statusFilter === "scheduled") {
    // Admin requesting scheduled posts only
    query = query.eq("status", "scheduled");
  }
  // If admin and no status filter, show all posts (drafts + published + scheduled)

  // Add search filter if provided
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  // Fetch tags for all posts
  let postsWithTags = data || [];
  if (data && data.length > 0) {
    const postIds = data.map(p => p.id);

    // Fetch all post_tags relationships with their tag data
    const { data: postTagsData } = await supabase
      .from("post_tags")
      .select("post_id, tags(*)")
      .in("post_id", postIds);

    // Group tags by post_id
    const tagsByPostId: Record<number, any[]> = {};
    if (postTagsData) {
      postTagsData.forEach((pt: any) => {
        if (!tagsByPostId[pt.post_id]) {
          tagsByPostId[pt.post_id] = [];
        }
        if (pt.tags) {
          tagsByPostId[pt.post_id].push(pt.tags);
        }
      });
    }

    // Attach tags to each post
    postsWithTags = data.map(post => ({
      ...post,
      tags: tagsByPostId[post.id] || [],
    }));
  }

  // Use private cache for authenticated users (may contain drafts/scheduled), public for anonymous
  const cacheControl = isAdmin
    ? "private, no-cache, no-store, must-revalidate"
    : "public, max-age=300";

  return c.json({
    posts: postsWithTags,
    total: count,
    limit: validLimit,
    offset: offset,
    hasMore: count ? offset + validLimit < count : false,
  }, {
    headers: {
      "Cache-Control": cacheControl,
    },
  });
});

app.get("/api/posts/:id", async (c) => {
  const { id } = c.req.param();
  const supabase = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_ANON_KEY,
  );
  let { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  if (!data) {
    return c.json({ error: "Post not found" }, 404);
  }

  // Auto-publish if this scheduled post is past its scheduled time
  if (data.status === "scheduled" && data.scheduled_for) {
    const scheduledTime = new Date(data.scheduled_for);
    const now = new Date();
    if (scheduledTime <= now) {
      const publishedAt = now.toISOString();
      await supabase
        .from("posts")
        .update({
          status: "published",
          published_at: publishedAt,
          scheduled_for: null,
        })
        .eq("id", id);

      // Update the data object for the response
      data = {
        ...data,
        status: "published",
        published_at: publishedAt,
        scheduled_for: null,
      };
      console.log(`Auto-published scheduled post ${id}`);
    }
  }

  // Fetch images for this post
  const { data: images } = await supabase
    .from("post_images")
    .select("*")
    .eq("post_id", id)
    .order("sort_order", { ascending: true });

  // Fetch tags for this post
  const { data: postTagsData } = await supabase
    .from("post_tags")
    .select("tags(*)")
    .eq("post_id", id);

  const tags = postTagsData?.map((pt: any) => pt.tags).filter(Boolean) || [];

  // Don't cache drafts or scheduled posts, only cache published posts
  const cacheControl = data.status === "published"
    ? "public, max-age=60" // Reduced to 1 minute for faster updates
    : "private, no-cache, no-store, must-revalidate";

  return c.json({ ...data, images: images || [], tags }, {
    headers: {
      "Cache-Control": cacheControl,
    },
  });
});

// Get author profile by username
app.get("/api/authors/:username", async (c) => {
  const { username } = c.req.param();
  const supabase = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_ANON_KEY,
  );

  // Fetch profile by username
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, role")
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    return c.json({ error: "Author not found" }, 404);
  }

  // Fetch author's published posts
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, created_at, title, description, image_url, category, type")
    .eq("author_id", profile.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (postsError) {
    return c.json({ error: postsError.message }, 500);
  }

  return c.json({
    author: {
      username: profile.username,
      role: profile.role,
    },
    posts: posts || [],
    postCount: posts?.length || 0,
  }, {
    headers: {
      "Cache-Control": "public, max-age=300", // Cache for 5 minutes
    },
  });
});

// --- PROTECTED ROUTES (Auth Required) ---
app.post("/api/posts", authMiddleware, async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");

  // Detect content type and parse accordingly
  const contentType = c.req.header("Content-Type") || "";
  let body: Record<string, any>;

  if (contentType.includes("application/json")) {
    // Parse JSON body
    body = await c.req.json();
  } else {
    // Parse FormData body
    body = await c.req.parseBody();
  }

  let title = body.title as string;
  const description = (body.description as string) || null;
  const category = (body.category as string) || null;
  const status = (body.status as string) || "published"; // Default to published
  const scheduled_for = (body.scheduled_for as string) || null; // ISO date string for scheduled posts
  // const grid_class = (body.grid_class as string) || null; // grid_class will be determined by server
  const imageFile = body.image as File | undefined; // File from upload
  const imageUrl = body.image_url as string | undefined; // URL from input

  // Validate status
  if (status !== "draft" && status !== "published" && status !== "scheduled") {
    return c.json({ error: "Invalid status. Must be 'draft', 'published', or 'scheduled'" }, 400);
  }

  // Validate scheduled_for if status is scheduled
  if (status === "scheduled") {
    if (!scheduled_for) {
      return c.json({ error: "scheduled_for is required when status is 'scheduled'" }, 400);
    }
    const scheduledDate = new Date(scheduled_for);
    if (isNaN(scheduledDate.getTime())) {
      return c.json({ error: "Invalid scheduled_for date format" }, 400);
    }
    if (scheduledDate <= new Date()) {
      return c.json({ error: "scheduled_for must be in the future" }, 400);
    }
  }

  // For drafts, allow empty title (use default). For published posts, title is required.
  if (!title || title.trim() === "") {
    if (status === "published") {
      return c.json({ error: "Title is required for published posts" }, 400);
    }
    title = "Untitled Draft"; // Default title for drafts
  }

  let finalImageUrl: string | null = null;

  if (imageFile) {
    // --- Image Upload Handling with WebP Conversion and Supabase Storage ---
    // Check file size
    if (imageFile.size > MAX_IMAGE_SIZE) {
      return c.json({ error: `Image too large (max 3MB, got ${(imageFile.size / 1024 / 1024).toFixed(2)}MB)` }, 400);
    }

    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      const contentType = imageFile.type;
      const originalFileName = imageFile.name;

      // Convert to WebP format (or keep original if conversion fails)
      const { buffer, extension } = await convertToWebP(arrayBuffer, contentType);

      // Upload to Supabase Storage
      finalImageUrl = await uploadImageToSupabase(
        supabase,
        buffer,
        originalFileName,
        extension
      );
    } catch (error: any) {
      console.error("Image upload/conversion process failed:", error);
      return c.json({ error: `Image upload failed: ${error.message}` }, 500);
    }
  } else if (imageUrl) {
    // --- Image URL Handling ---
    finalImageUrl = imageUrl;
  }

  // --- Dynamic Layout Assignment with Improved Randomization ---
  const { count: totalPosts, error: countError } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("Error fetching post count:", countError);
    return c.json({ error: "Failed to determine post layout" }, 500);
  }

  // Use the improved random layout function
  const layout = getRandomLayout(totalPosts || 0, (totalPosts || 0) + 1);
  const assignedType = layout.type;
  const assignedGridClass = layout.grid_class;

  // Keep layoutPatterns for the reassignAllPostLayouts function (though it's not used anymore)
  const layoutPatterns: { type: PostType; grid_class: string }[] = [];

  
  

  // Define the type for the data being inserted into Supabase
  type SupabasePostInsert = {
    title: string;
    description: string | null;
    image_url: string | null;
    category: string | null;
    grid_class: string | null;
    type: "horizontal" | "vertical" | "hover"; // Explicitly use the new types
    author_id: string;
    status: string;
    scheduled_for?: string | null;
    published_at?: string | null;
  };

  // Insert the new post into the 'posts' table with the authenticated user's ID
  const { data, error } = await supabase
    .from("posts")
    .insert([
      {
        title: title,
        description: description,
        image_url: finalImageUrl, // Use the determined image URL
        category: category,
        grid_class: assignedGridClass, // Use assigned grid_class
        type: assignedType, // Use assigned type
        author_id: user.id,
        status: status, // Add status field
        scheduled_for: status === "scheduled" ? scheduled_for : null,
        published_at: status === "published" ? new Date().toISOString() : null,
      } as SupabasePostInsert,
    ])
    .select();

  

  if (error) {
    console.error("Supabase insert error:", error);
    return c.json({ error: error.message }, 500);
  }

  // After successful post insertion, re-assign layouts for all posts
  
  await reassignAllPostLayouts(supabase, layoutPatterns);
  

  return c.json(data, 201);
});

app.put("/api/posts/:id", authMiddleware, async (c) => {
  const { id } = c.req.param();
  const supabase = c.get("supabase");
  const user = c.get("user");

  // Detect content type and parse accordingly
  const contentType = c.req.header("Content-Type") || "";
  let body: Record<string, any>;

  if (contentType.includes("application/json")) {
    // Parse JSON body
    body = await c.req.json();
  } else {
    // Parse FormData body
    body = await c.req.parseBody();
  }

  let title = body.title as string;

  const description = (body.description as string) || null;
  const category = (body.category as string) || null;
  const status = (body.status as string) || null;
  const scheduled_for = body.scheduled_for as string | null;
  const grid_class = (body.grid_class as string) || null;
  const postType = (body.type as PostType) || null;
  const imageFile = body.image as File | undefined; // File from upload
  const imageUrl = body.image_url as string | undefined; // URL from input

  // Validate status if provided
  if (status && status !== "draft" && status !== "published" && status !== "scheduled") {
    return c.json({ error: "Invalid status. Must be 'draft', 'published', or 'scheduled'" }, 400);
  }

  // Validate scheduled_for if status is scheduled
  if (status === "scheduled") {
    if (!scheduled_for) {
      return c.json({ error: "scheduled_for is required when status is 'scheduled'" }, 400);
    }
    const scheduledDate = new Date(scheduled_for);
    if (isNaN(scheduledDate.getTime())) {
      return c.json({ error: "Invalid scheduled_for date format" }, 400);
    }
    if (scheduledDate <= new Date()) {
      return c.json({ error: "scheduled_for must be in the future" }, 400);
    }
  }

  // For drafts, allow empty title (use default). For published posts, title is required.
  if (!title || title.trim() === "") {
    if (status === "published") {
      return c.json({ error: "Title is required for published posts" }, 400);
    }
    // If no title and it's a draft (or status not specified but will remain draft), use default
    title = "Untitled Draft";
  }

  // Ensure the user is authorized to edit this post (e.g., is the author or an admin)
  const { data: existingPost, error: fetchError } = await supabase
    .from("posts")
    .select("author_id, image_url, type, grid_class, status, published_at") // Also fetch existing fields for update logic
    .eq("id", id)
    .single();

  if (fetchError || !existingPost) {
    return c.json({ error: "Post not found or unauthorized" }, 404);
  }

  if (
    (existingPost.author_id !== user.id && existingPost.author_id !== null) && // If author_id is not null, it must match user.id
    user.role !== 'admin' // Or if the user is an admin
  ) {
    return c.json({ error: "Unauthorized to edit this post" }, 403);
  }

  let finalImageUrl: string | null = existingPost.image_url; // Start with existing image URL

  if (imageFile) {
    // --- Image Upload Handling with WebP Conversion and Supabase Storage (for updates) ---
    // Check file size
    if (imageFile.size > MAX_IMAGE_SIZE) {
      return c.json({ error: `Image too large (max 3MB, got ${(imageFile.size / 1024 / 1024).toFixed(2)}MB)` }, 400);
    }

    try {
      // If there was an old image stored in Supabase, delete it
      if (existingPost.image_url && existingPost.image_url.includes('supabase')) {
        try {
          await deleteImageFromSupabase(supabase, existingPost.image_url);
        } catch (deleteError) {
          console.warn("Failed to delete old image, continuing with upload:", deleteError);
        }
      }

      const arrayBuffer = await imageFile.arrayBuffer();
      const contentType = imageFile.type;
      const originalFileName = imageFile.name;

      // Convert to WebP format (or keep original if conversion fails)
      const { buffer, extension } = await convertToWebP(arrayBuffer, contentType);

      // Upload new image to Supabase Storage
      finalImageUrl = await uploadImageToSupabase(
        supabase,
        buffer,
        originalFileName,
        extension
      );
    } catch (error: any) {
      console.error("Image upload/conversion process failed (PUT):", error);
      return c.json({ error: `Image upload failed: ${error.message}` }, 500);
    }
  } else if (imageUrl !== undefined) { // If imageUrl is explicitly provided (can be null to clear)
    // If an old image existed in Supabase and a new URL is provided (or cleared), delete the old one
    if (existingPost.image_url && existingPost.image_url.includes('supabase') && existingPost.image_url !== imageUrl) {
      try {
        await deleteImageFromSupabase(supabase, existingPost.image_url);
      } catch (deleteError) {
        console.warn("Failed to delete old image:", deleteError);
      }
    }
    finalImageUrl = imageUrl;
  }

  

  // Determine scheduling fields based on status transition
  const finalStatus = status !== null ? status : existingPost.status;
  let updateData: Record<string, any> = {
    title: title,
    description: description,
    image_url: finalImageUrl, // Use the determined image URL
    category: category,
    grid_class: grid_class !== null ? grid_class : existingPost.grid_class, // Use new grid_class if provided, else existing
    type: postType !== null ? postType : existingPost.type, // Use new type if provided, else existing
    status: finalStatus,
  };

  // Handle scheduling fields based on status
  if (finalStatus === "scheduled") {
    updateData.scheduled_for = scheduled_for;
    updateData.published_at = null; // Clear published_at for scheduled posts
  } else if (finalStatus === "published") {
    updateData.scheduled_for = null; // Clear scheduled_for for published posts
    // Only set published_at if it wasn't already set (first time publishing)
    if (!existingPost.published_at) {
      updateData.published_at = new Date().toISOString();
    }
  } else {
    // Draft status - clear both
    updateData.scheduled_for = null;
    updateData.published_at = null;
  }

  const { data, error } = await supabase
    .from("posts")
    .update(updateData)
    .eq("id", id)
    .select();

  if (error) {
    console.error("Supabase update error:", error);
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 200);
});

// DELETE /api/posts/:id - Delete a post (admin only)
app.delete("/api/posts/:id", authMiddleware, async (c) => {
  const { id } = c.req.param();
  const supabase = c.get("supabase");
  const user = c.get("user");

  // Fetch the post to check authorization and get image URL
  const { data: existingPost, error: fetchError } = await supabase
    .from("posts")
    .select("author_id, image_url")
    .eq("id", id)
    .single();

  if (fetchError || !existingPost) {
    return c.json({ error: "Post not found" }, 404);
  }

  // Check authorization (author or admin)
  if (
    (existingPost.author_id !== user.id && existingPost.author_id !== null) &&
    user.role !== 'admin'
  ) {
    return c.json({ error: "Unauthorized to delete this post" }, 403);
  }

  // Delete all gallery images from storage
  const { data: galleryImages } = await supabase
    .from("post_images")
    .select("image_url")
    .eq("post_id", id);

  if (galleryImages && galleryImages.length > 0) {
    for (const img of galleryImages) {
      if (img.image_url?.includes('supabase')) {
        try {
          await deleteImageFromSupabase(supabase, img.image_url);
        } catch (deleteError) {
          console.warn("Failed to delete gallery image:", deleteError);
        }
      }
    }
  }

  // Also delete legacy cover image if different from gallery images
  if (existingPost.image_url && existingPost.image_url.includes('supabase')) {
    const isInGallery = galleryImages?.some(img => img.image_url === existingPost.image_url);
    if (!isInGallery) {
      try {
        await deleteImageFromSupabase(supabase, existingPost.image_url);
      } catch (deleteError) {
        console.warn("Failed to delete cover image:", deleteError);
      }
    }
  }

  // Delete the post (cascade will remove post_images records)
  const { error: deleteError } = await supabase
    .from("posts")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("Supabase delete error:", deleteError);
    return c.json({ error: deleteError.message }, 500);
  }

  return c.json({ message: "Post deleted successfully" }, 200);
});

// --- ADMIN ROUTES ---
// Endpoint to manually trigger layout reassignment for all posts
app.post("/api/admin/reassign-layouts", authMiddleware, async (c) => {
  const user = c.get("user");
  const supabase = c.get("supabase");

  // Create a fresh client without JWT to fetch profile (avoids RLS issues)
  const adminCheckClient = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_ANON_KEY
  );

  // Fetch user's role from profiles table
  const { data: profile, error: profileError } = await adminCheckClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching user profile:", profileError);
    return c.json({ error: "Failed to fetch user profile" }, 500);
  }

  // Only allow admins
  if (profile?.role !== 'admin') {
    return c.json({ error: "Unauthorized. Admin access required." }, 403);
  }

  // Fetch all posts
  const { data: allPosts, error: fetchError } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (fetchError || !allPosts) {
    return c.json({ error: "Failed to fetch posts" }, 500);
  }

  // Count distribution
  const distribution = { horizontal: 0, vertical: 0, hover: 0 };

  // Reassign layouts
  const updates = allPosts.map((post, index) => {
    const layout = getRandomLayout(index, allPosts.length);

    // Count for statistics
    if (layout.type === "split-horizontal") distribution.horizontal++;
    else if (layout.type === "split-vertical") distribution.vertical++;
    else distribution.hover++;

    return {
      id: post.id,
      type: layout.type,
      grid_class: layout.grid_class,
    };
  });

  // Update each post individually to bypass RLS
  const updatePromises = updates.map(update =>
    supabase
      .from("posts")
      .update({ type: update.type, grid_class: update.grid_class })
      .eq("id", update.id)
  );

  const results = await Promise.all(updatePromises);
  const errors = results.filter(r => r.error);

  if (errors.length > 0) {
    console.error("Some updates failed:", errors);
    return c.json({
      error: "Some updates failed",
      details: errors,
      distribution
    }, 500);
  }

  return c.json({
    message: "Successfully reassigned all layouts",
    total: allPosts.length,
    distribution: {
      horizontal: `${distribution.horizontal} (${((distribution.horizontal / allPosts.length) * 100).toFixed(1)}%)`,
      vertical: `${distribution.vertical} (${((distribution.vertical / allPosts.length) * 100).toFixed(1)}%)`,
      hover: `${distribution.hover} (${((distribution.hover / allPosts.length) * 100).toFixed(1)}%)`
    }
  }, 200);
});

// --- COMMENTS ROUTES ---
// GET comments for a post with like counts and sorting
app.get("/api/posts/:postId/comments", async (c) => {
  const { postId } = c.req.param();
  const sortBy = c.req.query("sort") || "likes"; // Default sort by likes
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  // Check if user is authenticated to determine if they've liked comments
  let currentUserId: string | null = null;
  const authHeader = c.req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const authenticatedSupabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await authenticatedSupabase.auth.getUser();
    if (user) currentUserId = user.id;
  }

  // Fetch comments with user email from profiles
  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select(`
      id,
      created_at,
      updated_at,
      content,
      post_id,
      user_id
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: false });

  if (commentsError) {
    return c.json({ error: commentsError.message }, 500);
  }

  if (!comments || comments.length === 0) {
    return c.json({ comments: [] }, 200);
  }

  // Get user emails for all commenters
  const userIds = [...new Set(comments.map(c => c.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);

  const userMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

  // Get like counts for all comments
  const commentIds = comments.map(c => c.id);
  const { data: likeCounts } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .in("comment_id", commentIds);

  const likeCountMap = new Map<number, number>();
  likeCounts?.forEach(like => {
    likeCountMap.set(like.comment_id, (likeCountMap.get(like.comment_id) || 0) + 1);
  });

  // Get current user's likes if authenticated
  let userLikesSet = new Set<number>();
  if (currentUserId) {
    const { data: userLikes } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", currentUserId)
      .in("comment_id", commentIds);
    userLikesSet = new Set(userLikes?.map(l => l.comment_id) || []);
  }

  // Combine data
  let enrichedComments = comments.map(comment => ({
    ...comment,
    user_email: userMap.get(comment.user_id) || "Unknown User",
    like_count: likeCountMap.get(comment.id) || 0,
    user_has_liked: userLikesSet.has(comment.id)
  }));

  // Sort comments
  if (sortBy === "likes") {
    enrichedComments.sort((a, b) => b.like_count - a.like_count);
  } else if (sortBy === "newest") {
    enrichedComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sortBy === "oldest") {
    enrichedComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  return c.json({ comments: enrichedComments }, 200);
});

// POST a new comment (auth required)
app.post("/api/posts/:postId/comments", authMiddleware, async (c) => {
  const { postId } = c.req.param();
  const supabase = c.get("supabase");
  const user = c.get("user");

  const body = await c.req.json();
  const { content } = body;

  if (!content || content.trim().length === 0) {
    return c.json({ error: "Comment content is required" }, 400);
  }

  const { data, error } = await supabase
    .from("comments")
    .insert([{
      content: content.trim(),
      post_id: parseInt(postId),
      user_id: user.id
    }])
    .select();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data[0], 201);
});

// DELETE a comment (auth required, own comment only)
app.delete("/api/comments/:commentId", authMiddleware, async (c) => {
  const { commentId } = c.req.param();
  const supabase = c.get("supabase");
  const user = c.get("user");

  // Check if comment exists and belongs to user
  const { data: comment, error: fetchError } = await supabase
    .from("comments")
    .select("user_id")
    .eq("id", commentId)
    .single();

  if (fetchError || !comment) {
    return c.json({ error: "Comment not found" }, 404);
  }

  if (comment.user_id !== user.id) {
    return c.json({ error: "Unauthorized to delete this comment" }, 403);
  }

  const { error: deleteError } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (deleteError) {
    return c.json({ error: deleteError.message }, 500);
  }

  return c.json({ message: "Comment deleted successfully" }, 200);
});

// POST/DELETE comment like (toggle)
app.post("/api/comments/:commentId/like", authMiddleware, async (c) => {
  const { commentId } = c.req.param();
  const supabase = c.get("supabase");
  const user = c.get("user");

  // Check if user already liked this comment
  const { data: existingLike } = await supabase
    .from("comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .single();

  if (existingLike) {
    // Unlike (remove like)
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", user.id);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ liked: false, message: "Comment unliked" }, 200);
  } else {
    // Like
    const { error } = await supabase
      .from("comment_likes")
      .insert([{
        comment_id: parseInt(commentId),
        user_id: user.id
      }]);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ liked: true, message: "Comment liked" }, 201);
  }
});

// --- POST IMAGES ROUTES ---
// GET images for a post (public)
app.get("/api/posts/:postId/images", async (c) => {
  const { postId } = c.req.param();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { data: images, error } = await supabase
    .from("post_images")
    .select("*")
    .eq("post_id", postId)
    .order("sort_order", { ascending: true });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ images: images || [] }, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
});

// POST upload multiple images (admin only)
app.post("/api/posts/:postId/images", authMiddleware, async (c) => {
  const { postId } = c.req.param();
  const supabase = c.get("supabase");
  const user = c.get("user");

  // Check admin role
  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  // Verify post exists
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, image_url")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const contentType = c.req.header("Content-Type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return c.json({ error: "Must use multipart/form-data" }, 400);
  }

  const body = await c.req.parseBody();

  // Get current max sort_order for this post
  const { data: existingImages } = await supabase
    .from("post_images")
    .select("sort_order")
    .eq("post_id", postId)
    .order("sort_order", { ascending: false })
    .limit(1);

  let currentSortOrder = existingImages?.[0]?.sort_order ?? -1;

  const uploadedImages = [];

  // Handle both single file and multiple files
  // parseBody returns either a single File or an array
  const imageEntries = Object.entries(body).filter(([key]) => key.startsWith("images"));

  const skippedFiles: string[] = [];

  for (const [, value] of imageEntries) {
    const files = Array.isArray(value) ? value : [value];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      // Check file size before processing
      if (file.size > MAX_IMAGE_SIZE) {
        console.warn(`File ${file.name} too large (${(file.size / 1024 / 1024).toFixed(2)}MB), skipping`);
        skippedFiles.push(file.name);
        continue;
      }

      try {
        // Convert to WebP (or keep original if conversion fails)
        const arrayBuffer = await file.arrayBuffer();
        const { buffer, extension } = await convertToWebP(arrayBuffer, file.type);

        // Upload to Supabase Storage
        const imageUrl = await uploadImageToSupabase(supabase, buffer, file.name, extension);

        currentSortOrder++;

        // Insert record
        const { data, error } = await supabase
          .from("post_images")
          .insert({
            post_id: parseInt(postId),
            image_url: imageUrl,
            sort_order: currentSortOrder,
          })
          .select()
          .single();

        if (error) {
          console.error("Failed to insert image record:", error);
          continue;
        }

        uploadedImages.push(data);
      } catch (error) {
        console.error("Failed to process image:", file.name, error);
      }
    }
  }

  // Update post's cover image if this is the first image and post has no cover
  if (uploadedImages.length > 0 && !post.image_url) {
    // Get the first image by sort_order
    const { data: firstImage } = await supabase
      .from("post_images")
      .select("image_url")
      .eq("post_id", postId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .single();

    if (firstImage) {
      await supabase
        .from("posts")
        .update({ image_url: firstImage.image_url })
        .eq("id", postId);
    }
  }

  return c.json({
    images: uploadedImages,
    skipped: skippedFiles.length > 0 ? skippedFiles : undefined,
    message: skippedFiles.length > 0 ? `${skippedFiles.length} file(s) skipped (too large, max 3MB)` : undefined
  }, 201);
});

// POST add image record only (client uploads directly to Supabase Storage)
// This lightweight endpoint just creates the database record
app.post("/api/posts/:postId/images/record", authMiddleware, async (c) => {
  const { postId } = c.req.param();
  const supabase = c.get("supabase");
  const user = c.get("user");

  // Check admin role
  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  // Verify post exists
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, image_url")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const body = await c.req.json();
  const { image_url, sort_order, focal_point, alt_text } = body;

  if (!image_url) {
    return c.json({ error: "image_url is required" }, 400);
  }

  // If sort_order not provided, get the next one
  let finalSortOrder = sort_order;
  if (finalSortOrder === undefined) {
    const { data: existingImages } = await supabase
      .from("post_images")
      .select("sort_order")
      .eq("post_id", postId)
      .order("sort_order", { ascending: false })
      .limit(1);

    finalSortOrder = (existingImages?.[0]?.sort_order ?? -1) + 1;
  }

  // Build insert data with optional focal_point and alt_text
  const insertData: Record<string, any> = {
    post_id: parseInt(postId),
    image_url,
    sort_order: finalSortOrder,
  };
  if (focal_point) {
    insertData.focal_point = focal_point;
  }
  if (alt_text) {
    insertData.alt_text = alt_text;
  }

  // Insert record
  const { data, error } = await supabase
    .from("post_images")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Failed to insert image record:", error);
    return c.json({ error: "Failed to add image record" }, 500);
  }

  // Update post's cover image if this is the first image and post has no cover
  if (!post.image_url) {
    const { data: firstImage } = await supabase
      .from("post_images")
      .select("image_url")
      .eq("post_id", postId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .single();

    if (firstImage) {
      await supabase
        .from("posts")
        .update({ image_url: firstImage.image_url })
        .eq("id", postId);
    }
  }

  return c.json(data, 201);
});

// DELETE a single image (admin only)
app.delete("/api/posts/:postId/images/:imageId", authMiddleware, async (c) => {
  const { postId, imageId } = c.req.param();
  const supabase = c.get("supabase");
  const user = c.get("user");

  // Check admin role
  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  // Get image to delete
  const { data: image, error: fetchError } = await supabase
    .from("post_images")
    .select("*")
    .eq("id", imageId)
    .eq("post_id", postId)
    .single();

  if (fetchError || !image) {
    return c.json({ error: "Image not found" }, 404);
  }

  // Delete from storage
  if (image.image_url && image.image_url.includes("supabase")) {
    try {
      await deleteImageFromSupabase(supabase, image.image_url);
    } catch (deleteError) {
      console.warn("Failed to delete image from storage:", deleteError);
    }
  }

  // Delete record
  const { error: deleteError } = await supabase
    .from("post_images")
    .delete()
    .eq("id", imageId);

  if (deleteError) {
    return c.json({ error: deleteError.message }, 500);
  }

  // Reorder remaining images
  const { data: remainingImages } = await supabase
    .from("post_images")
    .select("id, sort_order")
    .eq("post_id", postId)
    .order("sort_order", { ascending: true });

  if (remainingImages && remainingImages.length > 0) {
    for (let i = 0; i < remainingImages.length; i++) {
      if (remainingImages[i].sort_order !== i) {
        await supabase
          .from("post_images")
          .update({ sort_order: i })
          .eq("id", remainingImages[i].id);
      }
    }

    // Update cover image to first remaining image
    const { data: firstImage } = await supabase
      .from("post_images")
      .select("image_url")
      .eq("post_id", postId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .single();

    if (firstImage) {
      await supabase
        .from("posts")
        .update({ image_url: firstImage.image_url })
        .eq("id", postId);
    }
  } else {
    // No images left, clear cover image only if it was from the gallery
    const { data: post } = await supabase
      .from("posts")
      .select("image_url")
      .eq("id", postId)
      .single();

    if (post?.image_url === image.image_url) {
      await supabase
        .from("posts")
        .update({ image_url: null })
        .eq("id", postId);
    }
  }

  return c.json({ message: "Image deleted successfully" }, 200);
});

// PUT update focal point for an image (admin only)
app.put("/api/posts/:postId/images/:imageId/focal-point", authMiddleware, async (c) => {
  const { postId, imageId } = c.req.param();
  const supabase = c.get("supabase");
  const user = c.get("user");

  // Check admin role
  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const body = await c.req.json();
  const { focal_point } = body;

  if (!focal_point) {
    return c.json({ error: "focal_point is required" }, 400);
  }

  // Verify image exists and belongs to post
  const { data: image, error: fetchError } = await supabase
    .from("post_images")
    .select("id")
    .eq("id", imageId)
    .eq("post_id", postId)
    .single();

  if (fetchError || !image) {
    return c.json({ error: "Image not found" }, 404);
  }

  // Update focal point
  const { data, error } = await supabase
    .from("post_images")
    .update({ focal_point })
    .eq("id", imageId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update focal point:", error);
    return c.json({ error: "Failed to update focal point" }, 500);
  }

  return c.json(data, 200);
});

// PUT update alt text for an image (admin only)
app.put("/api/posts/:postId/images/:imageId/alt-text", authMiddleware, async (c) => {
  const { postId, imageId } = c.req.param();
  const supabase = c.get("supabase");
  const user = c.get("user");

  // Check admin role
  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const body = await c.req.json();
  const { alt_text } = body;

  // alt_text can be empty string to clear it, just not undefined
  if (alt_text === undefined) {
    return c.json({ error: "alt_text is required" }, 400);
  }

  // Verify image exists and belongs to post
  const { data: image, error: fetchError } = await supabase
    .from("post_images")
    .select("id")
    .eq("id", imageId)
    .eq("post_id", postId)
    .single();

  if (fetchError || !image) {
    return c.json({ error: "Image not found" }, 404);
  }

  // Update alt text
  const { data, error } = await supabase
    .from("post_images")
    .update({ alt_text: alt_text || null })
    .eq("id", imageId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update alt text:", error);
    return c.json({ error: "Failed to update alt text" }, 500);
  }

  return c.json(data, 200);
});

// PUT reorder images (admin only)
app.put("/api/posts/:postId/images/reorder", authMiddleware, async (c) => {
  const { postId } = c.req.param();
  const supabase = c.get("supabase");
  const user = c.get("user");

  // Check admin role
  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const body = await c.req.json();
  const { order } = body;

  if (!Array.isArray(order)) {
    return c.json({ error: "Invalid order format. Expected array of { id, sort_order }" }, 400);
  }

  // Update each image's sort_order
  for (const item of order) {
    const { error } = await supabase
      .from("post_images")
      .update({ sort_order: item.sort_order })
      .eq("id", item.id)
      .eq("post_id", postId);

    if (error) {
      console.error("Failed to update sort_order for image:", item.id, error);
    }
  }

  // Update cover image to first in order (sort_order = 0)
  const firstItem = order.find(item => item.sort_order === 0);
  if (firstItem) {
    const { data: imageData } = await supabase
      .from("post_images")
      .select("image_url")
      .eq("id", firstItem.id)
      .single();

    if (imageData) {
      await supabase
        .from("posts")
        .update({ image_url: imageData.image_url })
        .eq("id", postId);
    }
  }

  return c.json({ message: "Images reordered successfully" }, 200);
});

// --- TAGS ROUTES ---
// GET all tags (public, for autocomplete)
app.get("/api/tags", async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { data: tags, error } = await supabase
    .from("tags")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ tags: tags || [] }, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
});

// POST create a new tag (admin only)
app.post("/api/tags", authMiddleware, async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");

  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const body = await c.req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return c.json({ error: "Tag name is required" }, 400);
  }

  const trimmedName = name.trim();
  const slug = trimmedName.toLowerCase().replace(/\s+/g, "-");

  // Check if tag already exists
  const { data: existing } = await supabase
    .from("tags")
    .select("*")
    .eq("slug", slug)
    .single();

  if (existing) {
    return c.json(existing, 200); // Return existing tag
  }

  // Create new tag
  const { data, error } = await supabase
    .from("tags")
    .insert({ name: trimmedName, slug })
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

// GET tags for a specific post
app.get("/api/posts/:postId/tags", async (c) => {
  const { postId } = c.req.param();
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  const { data: postTags, error } = await supabase
    .from("post_tags")
    .select("tag_id, tags(*)")
    .eq("post_id", postId);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  const tags = postTags?.map(pt => pt.tags).filter(Boolean) || [];
  return c.json({ tags }, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
});

// PUT update tags for a post (admin only)
app.put("/api/posts/:postId/tags", authMiddleware, async (c) => {
  const { postId } = c.req.param();
  const supabase = c.get("supabase");
  const user = c.get("user");

  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const body = await c.req.json();
  const { tags } = body; // Array of { id?, name, slug }

  if (!Array.isArray(tags)) {
    return c.json({ error: "tags must be an array" }, 400);
  }

  // Verify post exists
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    return c.json({ error: "Post not found" }, 404);
  }

  // First, ensure all tags exist in the tags table
  const tagIds: number[] = [];
  for (const tag of tags) {
    if (tag.id && tag.id > 0) {
      tagIds.push(tag.id);
    } else {
      // Create new tag
      const { data: newTag, error: tagError } = await supabase
        .from("tags")
        .upsert(
          { name: tag.name, slug: tag.slug },
          { onConflict: "slug" }
        )
        .select()
        .single();

      if (tagError) {
        console.error("Failed to create tag:", tag.name, tagError);
        continue;
      }
      if (newTag) {
        tagIds.push(newTag.id);
      }
    }
  }

  // Delete existing post_tags for this post
  await supabase
    .from("post_tags")
    .delete()
    .eq("post_id", postId);

  // Insert new post_tags
  if (tagIds.length > 0) {
    const postTagsData = tagIds.map(tagId => ({
      post_id: parseInt(postId),
      tag_id: tagId,
    }));

    const { error: insertError } = await supabase
      .from("post_tags")
      .insert(postTagsData);

    if (insertError) {
      console.error("Failed to insert post_tags:", insertError);
      return c.json({ error: "Failed to update tags" }, 500);
    }
  }

  // Fetch and return updated tags
  const { data: updatedTags } = await supabase
    .from("post_tags")
    .select("tags(*)")
    .eq("post_id", postId);

  const resultTags = updatedTags?.map(pt => pt.tags).filter(Boolean) || [];

  return c.json({ tags: resultTags }, 200);
});

// --- SCHEDULED CRON JOB ---
// Auto-publish scheduled posts every 15 minutes
async function autoPublishScheduledPosts(env: Bindings): Promise<{
  found: number;
  published: number;
  posts: { id: number; title: string; status: string }[];
}> {
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  const supabase = createClient(env.SUPABASE_URL, supabaseKey);
  const now = new Date().toISOString();
  const result = {
    found: 0,
    published: 0,
    posts: [] as { id: number; title: string; status: string }[],
  };

  try {
    // Find all scheduled posts that are past their scheduled time
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from("posts")
      .select("id, title, scheduled_for")
      .eq("status", "scheduled")
      .lte("scheduled_for", now);

    if (fetchError) {
      console.error("Error fetching scheduled posts:", fetchError);
      return result;
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      console.log("No scheduled posts to publish");
      return result;
    }

    result.found = scheduledPosts.length;
    console.log(`Found ${scheduledPosts.length} scheduled post(s) to publish`);

    // Auto-publish each post
    for (const post of scheduledPosts) {
      const { error: updateError } = await supabase
        .from("posts")
        .update({
          status: "published",
          published_at: now,
          scheduled_for: null,
        })
        .eq("id", post.id);

      if (updateError) {
        console.error(`Failed to publish post ${post.id}:`, updateError);
        result.posts.push({ id: post.id, title: post.title, status: "failed" });
      } else {
        console.log(`Published post ${post.id}: "${post.title}"`);
        result.published++;
        result.posts.push({ id: post.id, title: post.title, status: "published" });
      }
    }

    console.log(`Successfully published ${result.published} post(s)`);
  } catch (error) {
    console.error("Error in autoPublishScheduledPosts:", error);
  }

  return result;
}

// --- DEBUG ENDPOINT (Always available - safe, no secrets exposed) ---
// GET /api/test/env - Check which env vars are set (for debugging .dev.vars issues)
app.get("/api/test/env", (c) => {
  return c.json({
    message: "Environment variable status (values not shown for security)",
    timestamp: new Date().toISOString(),
    env: {
      DEV_MODE: {
        isSet: Boolean(c.env.DEV_MODE),
        value: c.env.DEV_MODE || "(not set)",
      },
      SUPABASE_URL: {
        isSet: Boolean(c.env.SUPABASE_URL),
        // Show partial URL for debugging (safe - it's not a secret)
        preview: c.env.SUPABASE_URL ? c.env.SUPABASE_URL.substring(0, 30) + "..." : "(not set)",
      },
      SUPABASE_ANON_KEY: {
        isSet: Boolean(c.env.SUPABASE_ANON_KEY),
        // Just show if it's set, don't expose the key
        length: c.env.SUPABASE_ANON_KEY?.length || 0,
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        isSet: Boolean(c.env.SUPABASE_SERVICE_ROLE_KEY),
        // Just show if it's set, don't expose the key
        length: c.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      },
    },
    tips: [
      "If DEV_MODE is not set, check that server/.dev.vars exists",
      "Make sure .dev.vars has no quotes around values (KEY=value not KEY=\"value\")",
      "Restart wrangler dev after changing .dev.vars",
    ],
  });
});

// --- TEST ENDPOINT FOR CRON (Development Only) ---
// Manually trigger the scheduled job for testing
// GET /api/test/cron - Trigger cron job manually (for local testing)
app.get("/api/test/cron", async (c) => {
  if (c.env.DEV_MODE !== "true") {
    return c.json({ error: "Not found" }, 404);
  }

  console.log("Manual cron trigger requested at:", new Date().toISOString());
  
  const result = await autoPublishScheduledPosts(c.env);
  
  return c.json({
    message: "Cron job executed",
    timestamp: new Date().toISOString(),
    usingServiceRoleKey: Boolean(c.env.SUPABASE_SERVICE_ROLE_KEY),
    result: {
      scheduledPostsFound: result.found,
      postsPublished: result.published,
      details: result.posts,
    },
  });
});

// GET /api/test/scheduled-posts - View currently scheduled posts (for debugging)
app.get("/api/test/scheduled-posts", async (c) => {
  if (c.env.DEV_MODE !== "true") {
    return c.json({ error: "Not found" }, 404);
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  const now = new Date().toISOString();
  
  const { data: scheduledPosts, error } = await supabase
    .from("posts")
    .select("id, title, status, scheduled_for, created_at")
    .eq("status", "scheduled")
    .order("scheduled_for", { ascending: true });
  
  if (error) {
    return c.json({ error: error.message }, 500);
  }
  
  // Add helpful info about when each post will be published
  const postsWithInfo = (scheduledPosts || []).map(post => {
    const scheduledTime = new Date(post.scheduled_for);
    const currentTime = new Date(now);
    const isPastDue = scheduledTime <= currentTime;
    const timeUntilPublish = scheduledTime.getTime() - currentTime.getTime();
    
    return {
      ...post,
      isPastDue,
      timeUntilPublish: isPastDue ? "Ready to publish" : `${Math.ceil(timeUntilPublish / 1000 / 60)} minutes`,
      scheduledForLocal: scheduledTime.toLocaleString(),
    };
  });
  
  return c.json({
    currentTime: now,
    currentTimeLocal: new Date(now).toLocaleString(),
    totalScheduled: postsWithInfo.length,
    pastDue: postsWithInfo.filter(p => p.isPastDue).length,
    posts: postsWithInfo,
  });
})

// --- SERVER SETUP ---
// No need for Node.js 'serve' in Cloudflare Workers
export default {
  fetch: app.fetch,
  // Scheduled handler for cron triggers
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    console.log("🕐 Cron trigger fired:", new Date().toISOString());
    ctx.waitUntil(autoPublishScheduledPosts(env));
  },
};
