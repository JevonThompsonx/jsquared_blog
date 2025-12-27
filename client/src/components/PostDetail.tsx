

import { useState, useEffect, FC } from "react";
import { useParams, Link, useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { ThemeName } from "../../../shared/src/types";

interface PostDetailProps {
  currentTheme: ThemeName;
  setCurrentTheme: React.Dispatch<React.SetStateAction<ThemeName>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
}


type Post = {
  id: number;
  created_at: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  type: "split-horizontal" | "split-vertical" | "hover";
  grid_class: string | null;
  author_id: string;
};

const PostDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useOutletContext<PostDetailProps>();

  useEffect(() => {
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
        const data: Post = await response.json();
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
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--background)' }}>
      <div className="container mx-auto max-w-4xl">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors mb-6 group"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to all posts
        </Link>

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
            {/* Image section */}
            {post.image_url && (
              <div className="relative h-96 overflow-hidden">
                <img
                  src={post.image_url}
                  alt={post.title || "Post image"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              </div>
            )}

            {/* Content section */}
            <div className="p-8 sm:p-12">
              {/* Category and Admin controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <span className="inline-block px-4 py-1.5 bg-[var(--primary)] text-white rounded-full text-sm font-semibold">
                  {post.category || "Uncategorized"}
                </span>
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

              {/* Date */}
              <p className="text-sm text-[var(--text-secondary)] mb-8 flex items-center gap-2">
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

              {/* Divider */}
              <hr className="border-[var(--border)] mb-8" />

              {/* Description */}
              <div className="prose prose-lg max-w-none">
                <p className="text-lg text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                  {post.description}
                </p>
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
};

export default PostDetail;
