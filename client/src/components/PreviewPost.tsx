import { useEffect, useState, FC } from "react";
import { useNavigate } from "react-router-dom";
import { PostWithImagesAndTags } from "../../../shared/src/types";
import ImageGallery from "./ImageGallery";
import { calculateReadingTime } from "../utils/readingTime";
import ShareButtons from "./ShareButtons";

const PreviewPost: FC = () => {
  const [post, setPost] = useState<PostWithImagesAndTags | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load post data from sessionStorage
    const previewData = sessionStorage.getItem("previewPost");
    if (!previewData) {
      alert("No preview data found. Please use the Preview button from the post editor.");
      navigate("/admin");
      return;
    }

    try {
      const parsedData = JSON.parse(previewData);
      setPost(parsedData);
    } catch (error) {
      console.error("Failed to parse preview data:", error);
      alert("Failed to load preview data.");
      navigate("/admin");
    }
  }, [navigate]);

  if (!post) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{ background: 'var(--background)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--spinner)]"></div>
      </div>
    );
  }

  const readingTime = calculateReadingTime(post.description || "");

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--background)' }}>
      {/* Preview Banner */}
      <div className="container mx-auto max-w-4xl mb-6">
        <div className="bg-yellow-500 text-black font-bold px-6 py-4 rounded-lg shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>PREVIEW MODE - This is how your post will look</span>
          </div>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-black text-yellow-500 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>

      {/* Post Content */}
      <article className="container mx-auto max-w-4xl">
        <div className="bg-[var(--card-bg)] shadow-xl rounded-lg border border-[var(--border)] overflow-hidden">
          {/* Image Gallery */}
          {post.images && post.images.length > 0 && (
            <ImageGallery images={post.images} />
          )}

          {/* Post Header */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {post.category && (
                <span className="inline-block tracking-wide text-xs text-[var(--primary)] font-semibold uppercase px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                  {post.category}
                </span>
              )}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-block px-2 py-1 text-xs rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              {post.title || "Untitled Post"}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)] mb-6 pb-6 border-b border-[var(--border)]">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {readingTime}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Preview
              </span>
            </div>

            {/* Post Description */}
            <div
              className="prose prose-lg max-w-none text-[var(--text-primary)]"
              dangerouslySetInnerHTML={{ __html: post.description || "<p>No content yet.</p>" }}
            />

            {/* Share Buttons */}
            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <ShareButtons url="#" />
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};

export default PreviewPost;
