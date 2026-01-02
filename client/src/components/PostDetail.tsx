

import { useState, useEffect, FC } from "react";
import { useParams, Link, useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SEO from "./SEO";
import SuggestedPosts from "./SuggestedPosts";
import Comments from "./Comments";
import ShareButtons from "./ShareButtons";
import Breadcrumbs from "./Breadcrumbs";
import ImageGallery from "./ImageGallery";
import { calculateReadingTime, formatReadingTime } from "../utils/readingTime";

import { ThemeName, PostWithImages } from "../../../shared/src/types";

interface PostDetailProps {
  currentTheme: ThemeName;
  setCurrentTheme: React.Dispatch<React.SetStateAction<ThemeName>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
}

const PostDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<PostWithImages | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useOutletContext<PostDetailProps>();

  // Strip HTML tags for SEO meta description
  const stripHtml = (html: string | null): string => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  useEffect(() => {
    // Scroll to top when post detail page loads
    window.scrollTo({ top: 0, behavior: 'instant' });

    const fetchPost = async () => {
      if (!id) {
        setError("Post ID is missing.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/posts/${id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: PostWithImages = await response.json();
        setPost(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  return (
    <>
      {post && (
        <SEO
          title={post.title}
          description={stripHtml(post.description) || undefined}
          image={post.image_url || undefined}
          type="article"
          publishedTime={post.created_at}
          section={post.category || undefined}
          tags={post.category ? [post.category] : undefined}
          structuredData={{
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": stripHtml(post.description) || "",
            "image": post.image_url || "https://jsquaredadventures.com/og-image.jpg",
            "datePublished": post.created_at,
            "dateModified": post.created_at,
            "author": {
              "@type": "Person",
              "name": "J²Adventures"
            },
            "publisher": {
              "@type": "Organization",
              "name": "J²Adventures",
              "logo": {
                "@type": "ImageObject",
                "url": "https://jsquaredadventures.com/og-image.jpg"
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://jsquaredadventures.com/posts/${post.id}`
            },
            "articleSection": post.category || "Travel",
            "keywords": post.category || "travel, adventure"
          }}
        />
      )}
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--background)' }}>
        <div className="container mx-auto max-w-4xl">
        {/* Breadcrumbs */}
        {post ? (
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              ...(post.category
                ? [{ label: post.category, href: `/category/${encodeURIComponent(post.category)}` }]
                : []),
              { label: post.title || "Post" },
            ]}
          />
        ) : (
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Post" }]} />
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--spinner)]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h3 className="text-xl font-bold text-red-700 mb-2">Error Loading Post</h3>
            <p className="text-red-600">{error}</p>
          </div>
        ) : !post ? (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-8 text-center">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Post Not Found</h3>
            <p className="text-[var(--text-secondary)]">The post you're looking for doesn't exist.</p>
          </div>
        ) : (
          <article className="bg-[var(--card-bg)] shadow-xl rounded-2xl overflow-hidden border border-[var(--border)]">
            {/* Image Gallery section */}
            {(post.images && post.images.length > 0) || post.image_url ? (
              <ImageGallery
                images={post.images || []}
                fallbackImage={post.image_url}
                alt={post.title || "Post image"}
              />
            ) : null}

            {/* Content section */}
            <div className="p-8 sm:p-12">
              {/* Category, Draft status, and Admin controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Link
                    to={`/category/${encodeURIComponent(post.category || "Uncategorized")}`}
                    className="inline-block px-4 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-full text-sm font-semibold transition-colors"
                  >
                    {post.category || "Uncategorized"}
                  </Link>
                  {post.status === "draft" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-black rounded-full text-sm font-bold">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      DRAFT
                    </span>
                  )}
                </div>
                {user && user.role === "admin" && (
                  <Link
                    to={`/posts/${post.id}/edit`}
                    className="inline-flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-md"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Post
                  </Link>
                )}
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] mb-4 leading-tight">
                {post.title}
              </h1>

              {/* Date and Reading Time */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)] mb-8">
                <p className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(post.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <span className="text-[var(--text-secondary)]">•</span>
                <p className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatReadingTime(calculateReadingTime(post.description))}
                </p>
              </div>

              {/* Divider */}
              <hr className="border-[var(--border)] mb-8" />

              {/* Description */}
              <div
                className="prose prose-lg max-w-none text-lg text-[var(--text-primary)] leading-relaxed tiptap"
                dangerouslySetInnerHTML={{ __html: post.description || "" }}
              />

              {/* Share Buttons */}
              <div className="mt-8 pt-6 border-t border-[var(--border)]">
                <ShareButtons
                  url={`https://jsquaredadventures.com/posts/${post.id}`}
                />
              </div>
            </div>
          </article>
        )}

        {/* Comments Section */}
        {post && (
          <Comments postId={post.id} />
        )}
        </div>

        {/* Suggested Posts */}
        {post && (
          <SuggestedPosts
            category={post.category || undefined}
            excludeId={post.id}
            limit={4}
            title={post.category ? `More ${post.category} Adventures` : "More Adventures"}
          />
        )}
      </div>
    </>
  );
};

export default PostDetail;
