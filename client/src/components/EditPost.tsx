

import { useState, useEffect, FC } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { PostWithImages, PostImage, CATEGORIES } from "../../../shared/src/types";
import RichTextEditor from "./RichTextEditor";
import ImageUploader, { PendingFile } from "./ImageUploader";
import { uploadImageToStorage, addImageRecord, updateImageFocalPoint } from "../utils/imageUpload";

const EditPost: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [post, setPost] = useState<PostWithImages>(() => ({
    id: parseInt(id || "0"),
    title: "",
    description: "",
    image_url: "",
    category: "",
    type: "split-horizontal",
    created_at: new Date().toISOString(),
    author_id: "",
    status: "published",
    images: []
  }));
  const [uploadMethod, setUploadMethod] = useState<'url' | 'gallery'>('gallery');
  const [existingImages, setExistingImages] = useState<PostImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
  const [focalPointUpdates, setFocalPointUpdates] = useState<Map<number, string>>(new Map());
  const [reorderedImages, setReorderedImages] = useState<PostImage[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryValue, setCustomCategoryValue] = useState("");


  useEffect(() => {
    // Scroll to top when edit page loads
    window.scrollTo({ top: 0, behavior: 'instant' });

    const fetchPost = async () => {
      if (!id) {
        return;
      }
      try {
        const response = await fetch(`/api/posts/${id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: PostWithImages = await response.json();
        setPost(data);

        // Set existing images from the post
        if (data.images && data.images.length > 0) {
          setExistingImages(data.images);
          setUploadMethod('gallery');
        } else if (data.image_url) {
          setUploadMethod('url');
        } else {
          setUploadMethod('gallery');
        }

        // Check if category is custom (not in predefined list)
        if (data.category && !CATEGORIES.includes(data.category as any)) {
          setIsCustomCategory(true);
          setCustomCategoryValue(data.category);
        }
      } catch (e: any) {
        console.error("Error fetching post in EditPost.tsx:", e);
      }
    };

    fetchPost();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "category") {
      if (value === "Other") {
        setIsCustomCategory(true);
        setPost((prev) => ({ ...prev, category: "" } as PostWithImages));
      } else {
        setIsCustomCategory(false);
        setCustomCategoryValue("");
        setPost((prev) => ({ ...prev, [name]: value } as PostWithImages));
      }
    } else {
      setPost((prev) => ({ ...prev, [name]: value } as PostWithImages));
    }
  };

  const handleDescriptionChange = (html: string) => {
    setPost((prev) => ({ ...prev, description: html } as PostWithImages));
  };

  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomCategoryValue(value);
    setPost((prev) => ({ ...prev, category: value } as PostWithImages));
  };

  // Gallery image handlers
  const handleGalleryFilesSelected = (files: PendingFile[]) => {
    setPendingFiles((prev) => [...prev, ...files]);
  };

  const handleRemovePendingFile = (index: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(pendingFiles[index].previewUrl);
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdatePendingFocalPoint = (index: number, focalPoint: string) => {
    setPendingFiles((prev) =>
      prev.map((pf, i) => (i === index ? { ...pf, focalPoint } : pf))
    );
  };

  const handleUpdateExistingFocalPoint = (imageId: number, focalPoint: string) => {
    // Update local state for preview
    setExistingImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, focal_point: focalPoint } : img))
    );
    // Track the update to save on submit
    setFocalPointUpdates((prev) => new Map(prev).set(imageId, focalPoint));
  };

  const handleRemoveExistingImage = (imageId: number) => {
    setImagesToDelete((prev) => [...prev, imageId]);
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleReorderImages = (reordered: PostImage[]) => {
    setExistingImages(reordered);
    setReorderedImages(reordered);
  };

  const handleDelete = async () => {
    if (!user || !token || !id) return;

    // Confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to delete this post? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete post");
      }

      alert("Post deleted successfully!");
      navigate("/");
    } catch (err: any) {
      console.error(err);
      alert(`Error deleting post: ${err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token || !post || !id) return;

    // Image is required for published posts, optional for drafts
    const imageRequired = post.status === "published";
    const hasImages = existingImages.length > 0 || pendingFiles.length > 0;

    if (uploadMethod === 'gallery') {
      if (imageRequired && !hasImages) {
        alert("Please add at least one image for published posts.");
        return;
      }
    } else {
      if (imageRequired && !post.image_url) {
        alert("Please enter an image URL for published posts.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Step 1: Update the post
      const bodyContent = JSON.stringify(post);
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: headers,
        body: bodyContent,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update post");
      }

      // Step 2: Delete images marked for deletion
      for (const imageId of imagesToDelete) {
        try {
          await fetch(`/api/posts/${id}/images/${imageId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (err) {
          console.error("Failed to delete image:", imageId, err);
        }
      }

      // Step 3: Reorder images if changed
      if (reorderedImages && reorderedImages.length > 0) {
        const order = reorderedImages.map((img, idx) => ({
          id: img.id,
          sort_order: idx,
        }));

        await fetch(`/api/posts/${id}/images/reorder`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ order }),
        });
      }

      // Step 3.5: Update focal points for existing images
      if (focalPointUpdates.size > 0) {
        for (const [imageId, focalPoint] of focalPointUpdates) {
          try {
            await updateImageFocalPoint(parseInt(id), imageId, focalPoint, token);
            console.log(`Updated focal point for image ${imageId}`);
          } catch (err) {
            console.error(`Failed to update focal point for image ${imageId}:`, err);
          }
        }
      }

      // Step 4: Upload new images directly to Supabase Storage (bypasses Worker limits)
      if (pendingFiles.length > 0) {
        const uploadErrors: string[] = [];
        for (let i = 0; i < pendingFiles.length; i++) {
          const pendingFile = pendingFiles[i];
          try {
            // Upload directly to Supabase Storage
            console.log(`Uploading ${pendingFile.file.name} to Supabase Storage...`);
            const imageUrl = await uploadImageToStorage(pendingFile.file);
            console.log(`Storage upload successful: ${imageUrl}`);

            // Add database record via lightweight API endpoint (with focal point)
            console.log(`Adding database record for ${pendingFile.file.name}...`);
            await addImageRecord(parseInt(id), imageUrl, token, undefined, pendingFile.focalPoint);
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

      alert("Post updated successfully!");
      navigate(`/posts/${id}`);
    } catch (err: any) {
      console.error(err);
      alert(`Error updating post: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--background)' }}>
      <div className="container mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">Edit Post</h1>
        <div className="bg-[var(--card-bg)] shadow-xl rounded-lg border border-[var(--border)] p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Title {post?.status === "published" && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={post?.title || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 px-3 py-2"
                required={post?.status === "published"}
                placeholder={post?.status === "draft" ? "Untitled Draft (optional)" : "Enter post title"}
              />
              {post?.status === "draft" && (
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Title is optional for drafts. It will default to "Untitled Draft" if left empty.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Description</label>
              <RichTextEditor
                content={post?.description || ""}
                onChange={handleDescriptionChange}
                placeholder="Edit your adventure story with rich formatting..."
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
                  <span className="ml-2 text-sm text-[var(--text-primary)]">Image Gallery</span>
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
                  Gallery Images {post?.status === "published" && <span className="text-red-500">*</span>}
                </label>
                <ImageUploader
                  existingImages={existingImages}
                  pendingFiles={pendingFiles}
                  onFilesSelected={handleGalleryFilesSelected}
                  onRemovePendingFile={handleRemovePendingFile}
                  onRemoveExistingImage={handleRemoveExistingImage}
                  onReorderImages={handleReorderImages}
                  onUpdatePendingFocalPoint={handleUpdatePendingFocalPoint}
                  onUpdateExistingFocalPoint={handleUpdateExistingFocalPoint}
                  disabled={isSubmitting}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="image_url" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Image URL {post?.status === "published" && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  id="image_url"
                  name="image_url"
                  value={post?.image_url || ""}
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
                value={isCustomCategory ? "Other" : (post?.category || "")}
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
              <label htmlFor="status" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Status</label>
              <select
                id="status"
                name="status"
                value={post?.status || "published"}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 px-3 py-2"
              >
                <option value="published">Published (Visible to all)</option>
                <option value="draft">Draft (Only visible to admins)</option>
              </select>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Drafts are only visible to admins. Published posts are visible to everyone.
              </p>
            </div>

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
                  Updating Post...
                </>
              ) : (
                "Update Post"
              )}
            </button>
          </form>

          {/* Delete Button (outside form) */}
          <button
            onClick={handleDelete}
            disabled={isSubmitting}
            className="w-full mt-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Post
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPost;