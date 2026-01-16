

import { useState, useEffect, FC } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

import { CATEGORIES, Tag } from "../../../shared/src/types";
import RichTextEditor from "./RichTextEditor";
import ImageUploader, { PendingFile } from "./ImageUploader";
import TagInput from "./TagInput";
import { uploadImageToStorage, addImageRecord } from "../utils/imageUpload";
import { isoToLocalDateTimeInput, localDateTimeInputToISO, getCurrentLocalDateTimeInput } from "../utils/dateTime";


type Post = {
  id: number;
  created_at: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  author_id: string;
  type: "split-horizontal" | "split-vertical" | "hover";
  status: "draft" | "published" | "scheduled";
  scheduled_for?: string | null;
  published_at?: string | null;
};

const Admin: FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();


  const [post, setPost] = useState<Omit<Post, "id" | "created_at" | "author_id">>({
    title: "",
    description: "",
    image_url: "",
    category: "",
    type: "split-vertical" as const,
    status: "published" as const,
  });

  const [uploadMethod, setUploadMethod] = useState<'url' | 'gallery'>('gallery');
  const [galleryFiles, setGalleryFiles] = useState<PendingFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleMessage, setShuffleMessage] = useState<string | null>(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryValue, setCustomCategoryValue] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  // Fetch available tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch("/api/tags");
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(data.tags || []);
        }
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    };
    fetchTags();
  }, []);

  // Check if there's a copied post in location state
  useEffect(() => {
    if (location.state?.copiedPost) {
      const copiedData = location.state.copiedPost;
      setPost((prev) => ({
        ...prev,
        title: copiedData.title || "",
        description: copiedData.description || "",
        category: copiedData.category || "",
        status: "draft" as const, // Always create copies as drafts
      }));
      
      if (copiedData.tags && copiedData.tags.length > 0) {
        setSelectedTags(copiedData.tags);
      }

      // Check if category is custom
      if (copiedData.category && !CATEGORIES.includes(copiedData.category as any)) {
        setIsCustomCategory(true);
        setCustomCategoryValue(copiedData.category);
      }

      // Clear the location state to prevent re-population on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "category") {
      if (value === "Other") {
        setIsCustomCategory(true);
        setPost((prev) => ({ ...prev, category: "" }));
      } else {
        setIsCustomCategory(false);
        setCustomCategoryValue("");
        setPost((prev) => ({ ...prev, [name]: value }));
      }
    } else if (name === "scheduled_for") {
      // For datetime-local inputs, value is in local time format: "YYYY-MM-DDTHH:mm"
      // Convert to ISO (UTC) for storage
      const isoDateTime = localDateTimeInputToISO(value);
      setPost((prev) => ({ ...prev, [name]: isoDateTime }));
    } else {
      setPost((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDescriptionChange = (html: string) => {
    setPost((prev) => ({ ...prev, description: html }));
  };

  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomCategoryValue(value);
    setPost((prev) => ({ ...prev, category: value }));
  };

  const handlePreview = () => {
    // Store preview data in sessionStorage
    const previewData = {
      ...post,
      images: galleryFiles.map((file) => ({
        image_url: file.previewUrl,
        focal_point: file.focalPoint,
        alt_text: file.altText,
      })),
      tags: selectedTags,
      id: -1, // Temporary ID for preview
      created_at: new Date().toISOString(),
      author_id: user?.id || "",
    };
    
    sessionStorage.setItem("previewPost", JSON.stringify(previewData));
    
    // Open preview in new tab
    window.open("/posts/preview", "_blank");
  };

  const handleGalleryFilesSelected = (files: PendingFile[]) => {
    setGalleryFiles((prev) => [...prev, ...files]);
  };

  const handleRemovePendingFile = (index: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(galleryFiles[index].previewUrl);
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdatePendingFocalPoint = (index: number, focalPoint: string) => {
    setGalleryFiles((prev) =>
      prev.map((pf, i) => (i === index ? { ...pf, focalPoint } : pf))
    );
  };

  const handleUpdatePendingAltText = (index: number, altText: string) => {
    setGalleryFiles((prev) =>
      prev.map((pf, i) => (i === index ? { ...pf, altText } : pf))
    );
  };

  const handleShuffleLayouts = async () => {
    if (!user || !user.token) return;

    setIsShuffling(true);
    setShuffleMessage(null);

    try {
      const response = await fetch("/api/admin/reassign-layouts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
      });

      // Log response details for debugging
      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      const responseText = await response.text();
      console.log("Response text:", responseText);

      if (!response.ok) {
        // Try to parse as JSON, otherwise use the text
        let errorMessage = "Failed to shuffle layouts";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Parse the response
      const result = JSON.parse(responseText);
      setShuffleMessage(
        `✅ Successfully shuffled ${result.total} posts!\n` +
        `Horizontal: ${result.distribution.horizontal}\n` +
        `Vertical: ${result.distribution.vertical}\n` +
        `Hover: ${result.distribution.hover}`
      );

      // Refresh the page after a short delay to show the new layouts
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error: any) {
      console.error("Shuffle error:", error);
      setShuffleMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsShuffling(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.token) return;

    // Image is required for published and scheduled posts, optional for drafts
    const imageRequired = post.status === "published" || post.status === "scheduled";

    if (uploadMethod === 'gallery') {
      if (imageRequired && galleryFiles.length === 0) {
        alert("Please add at least one image for published/scheduled posts.");
        return;
      }
    } else {
      if (imageRequired && !post.image_url) {
        alert("Please enter an image URL for published/scheduled posts.");
        return;
      }
    }

    // Validate scheduled_for when status is "scheduled"
    if (post.status === "scheduled") {
      if (!post.scheduled_for) {
        alert("Please select a date and time for scheduled publication.");
        return;
      }
      const scheduledDate = new Date(post.scheduled_for);
      if (scheduledDate <= new Date()) {
        alert("Scheduled time must be in the future.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create the post
      // Convert scheduled_for to ISO string if set (preserves timezone info)
      const postData = {
        ...post,
        author_id: user.id,
        scheduled_for: post.status === "scheduled" && post.scheduled_for
          ? new Date(post.scheduled_for).toISOString()
          : null,
      };
      const bodyContent = JSON.stringify(postData);
      const headers: HeadersInit = {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: headers,
        body: bodyContent,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create post");
      }

      const newPost: Post[] = await response.json();
      const postId = newPost[0]?.id;

      // Step 2: Upload gallery images directly to Supabase Storage (bypasses Worker limits)
      if (postId && galleryFiles.length > 0) {
        const uploadErrors: string[] = [];
        for (const pendingFile of galleryFiles) {
          try {
            // Upload directly to Supabase Storage
            console.log(`Uploading ${pendingFile.file.name} to Supabase Storage...`);
            const imageUrl = await uploadImageToStorage(pendingFile.file);
            console.log(`Storage upload successful: ${imageUrl}`);

            // Add database record via lightweight API endpoint (with focal point and alt text)
            console.log(`Adding database record for ${pendingFile.file.name}...`);
            await addImageRecord(postId, imageUrl, user.token, undefined, pendingFile.focalPoint, pendingFile.altText);
            console.log(`Database record added for ${pendingFile.file.name}`);
          } catch (uploadErr: any) {
            console.error("Error uploading image:", pendingFile.file.name, uploadErr);
            uploadErrors.push(`${pendingFile.file.name}: ${uploadErr.message}`);
          }
        }
        if (uploadErrors.length > 0) {
          alert(`Some images failed to upload:\n${uploadErrors.join('\n')}`);
        }
      }

      // Step 3: Save tags for the post
      if (postId && selectedTags.length > 0) {
        try {
          await fetch(`/api/posts/${postId}/tags`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${user.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ tags: selectedTags }),
          });
          console.log(`Tags saved for post ${postId}`);
        } catch (tagErr: any) {
          console.error("Failed to save tags:", tagErr);
        }
      }

      // Reset form
      setPost({
        title: "",
        description: "",
        image_url: "",
        category: "",
        type: "split-vertical",
        status: "published",
      });
      setGalleryFiles([]);
      setSelectedTags([]);

      alert("Post created successfully!");
      if (postId) {
        navigate(`/posts/${postId}`);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Error creating post: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--background)' }}>
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">Admin Dashboard</h1>

        {/* Shuffle Layouts Section */}
        <div className="mb-8 bg-[var(--card-bg)] shadow-xl rounded-lg border border-[var(--border)] p-6 sm:p-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Layout Manager</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Randomize the layout types for all posts. This will redistribute posts among horizontal (2-column), vertical, and hover layouts for a fresh look.
              </p>
            </div>
          </div>

          {shuffleMessage && (
            <div className={`mb-4 p-4 rounded-lg ${shuffleMessage.includes('✅') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-mono whitespace-pre-line ${shuffleMessage.includes('✅') ? 'text-green-700' : 'text-red-700'}`}>
                {shuffleMessage}
              </p>
            </div>
          )}

          <button
            onClick={handleShuffleLayouts}
            disabled={isShuffling}
            className="inline-flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 ${isShuffling ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isShuffling ? "Shuffling..." : "Shuffle All Post Layouts"}
          </button>
        </div>

        {/* Create New Post Section */}
        <div className="bg-[var(--card-bg)] shadow-xl rounded-lg border border-[var(--border)] p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Create New Post</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Title {post.status === "published" && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={post.title}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 px-3 py-2"
                required={post.status === "published"}
                placeholder={post.status === "draft" ? "Untitled Draft (optional)" : "Enter post title"}
              />
              {post.status === "draft" && (
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Title is optional for drafts. It will default to "Untitled Draft" if left empty.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Description</label>
              <RichTextEditor
                content={post.description || ""}
                onChange={handleDescriptionChange}
                placeholder="Share your adventure story with rich formatting..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Image Source</label>
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="uploadMethod"
                    value="gallery"
                    checked={uploadMethod === 'gallery'}
                    onChange={() => setUploadMethod('gallery')}
                  />
                  <span className="ml-2 text-sm text-[var(--text-primary)]">Upload Images (Gallery)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="uploadMethod"
                    value="url"
                    checked={uploadMethod === 'url'}
                    onChange={() => setUploadMethod('url')}
                  />
                  <span className="ml-2 text-sm text-[var(--text-primary)]">Image URL</span>
                </label>
              </div>
            </div>

            {uploadMethod === 'gallery' ? (
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Gallery Images {post.status === "published" && <span className="text-red-500">*</span>}
                </label>
                <ImageUploader
                  existingImages={[]}
                  pendingFiles={galleryFiles}
                  onFilesSelected={handleGalleryFilesSelected}
                  onRemovePendingFile={handleRemovePendingFile}
                  onRemoveExistingImage={() => {}}
                  onReorderImages={() => {}}
                  onUpdatePendingFocalPoint={handleUpdatePendingFocalPoint}
                  onUpdatePendingAltText={handleUpdatePendingAltText}
                  disabled={isSubmitting}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="image_url" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Image URL {post.status === "published" && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  id="image_url"
                  name="image_url"
                  value={post.image_url || ""}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 px-3 py-2"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            )}
            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Category</label>
              <select
                id="category"
                name="category"
                value={isCustomCategory ? "Other" : (post.category || "")}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 px-3 py-2"
              >
                <option value="">Select a category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {isCustomCategory && (
                <input
                  type="text"
                  id="custom-category"
                  name="custom-category"
                  value={customCategoryValue}
                  onChange={handleCustomCategoryChange}
                  placeholder="Enter custom category name"
                  className="mt-2 block w-full rounded-md border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 px-3 py-2"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Tags</label>
              <TagInput
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                availableTags={availableTags}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Status</label>
              <select
                id="status"
                name="status"
                value={post.status}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 px-3 py-2"
              >
                <option value="published">Published (Visible to all)</option>
                <option value="draft">Draft (Only visible to admins)</option>
                <option value="scheduled">Scheduled (Publish later)</option>
              </select>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {post.status === "scheduled"
                  ? "Choose when this post will be automatically published."
                  : "Drafts are only visible to admins. Published posts are visible to everyone."}
              </p>
            </div>

            {/* Scheduling Date/Time Picker */}
            {post.status === "scheduled" && (
              <div>
                <label htmlFor="scheduled_for" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Publish Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="scheduled_for"
                  name="scheduled_for"
                  value={isoToLocalDateTimeInput(post.scheduled_for)}
                  onChange={handleChange}
                  min={getCurrentLocalDateTimeInput()}
                  className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 px-3 py-2"
                  required
                />
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  The post will be automatically published at this time. Time is in your local timezone.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Post...
                </>
              ) : (
                "Create Post"
              )}
            </button>

            {/* Preview Button */}
            <button
              type="button"
              onClick={handlePreview}
              disabled={isSubmitting}
              className="w-full mt-3 bg-[var(--background)] border-2 border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white disabled:bg-gray-400 disabled:border-gray-400 text-[var(--primary)] font-bold py-3 px-6 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview Post
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Admin;