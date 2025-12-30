

import { useState, useEffect, FC } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { Post, CATEGORIES } from "../../../shared/src/types";
import RichTextEditor from "./RichTextEditor";

const EditPost: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [post, setPost] = useState<Post>(() => ({
    id: parseInt(id || "0"),
    title: "",
    description: "",
    image_url: "",
    category: "",
    type: "split-horizontal",
    created_at: new Date().toISOString(),
    author_id: "",
    status: "published"
  }));
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
        const data: Post = await response.json();
        setPost(data);
        if (data.image_url) {
          setUploadMethod('url');
        } else {
          setUploadMethod('file');
        }
        // Check if category is custom (not in predefined list)
        if (data.category && !CATEGORIES.includes(data.category as any)) {
          setIsCustomCategory(true);
          setCustomCategoryValue(data.category);
        }
      } catch (e: any) {
        console.error("Error fetching post in EditPost.tsx:", e);
      } finally {
      }
    };

    fetchPost();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "category") {
      if (value === "Other") {
        setIsCustomCategory(true);
        setPost((prev) => ({ ...prev, category: "" } as Post));
      } else {
        setIsCustomCategory(false);
        setCustomCategoryValue("");
        setPost((prev) => ({ ...prev, [name]: value } as Post));
      }
    } else {
      setPost((prev) => ({ ...prev, [name]: value } as Post));
    }
  };

  const handleDescriptionChange = (html: string) => {
    setPost((prev) => ({ ...prev, description: html } as Post));
  };

  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomCategoryValue(value);
    setPost((prev) => ({ ...prev, category: value } as Post));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setPost((prev) => ({ ...prev, image_url: null } as Post));
    } else {
      setSelectedFile(null);
    }
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
    if (!user || !token || !post) return;

    let bodyContent;
    let headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
    };

    // Image is required for published posts, optional for drafts
    const imageRequired = post.status === "published";

    if (uploadMethod === 'file') {
      if (imageRequired && !selectedFile && !post.image_url) {
        alert("Please select an image file to upload for published posts.");
        return;
      }
      const formData = new FormData();
      formData.append('title', post.title);
      formData.append('description', post.description || '');
      formData.append('category', post.category || '');
      formData.append('status', post.status);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }
      bodyContent = formData;
    } else {
      if (imageRequired && !post.image_url) {
        alert("Please enter an image URL for published posts.");
        return;
      }
      bodyContent = JSON.stringify(post);
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: headers,
        body: bodyContent,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update post");
      }

      alert("Post updated successfully!");
      navigate(`/posts/${id}`);
    } catch (err: any) {
      console.error(err);
      alert(`Error updating post: ${err.message}`);
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
                    value="url"
                    checked={uploadMethod === 'url'}
                    onChange={() => setUploadMethod('url')}
                  />
                  <span className="ml-2 text-sm text-[var(--text-primary)]">Image URL</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="uploadMethod"
                    value="file"
                    checked={uploadMethod === 'file'}
                    onChange={() => setUploadMethod('file')}
                  />
                  <span className="ml-2 text-sm text-[var(--text-primary)]">Upload File</span>
                </label>
              </div>
            </div>

            {uploadMethod === 'url' ? (
              <div>
                <label htmlFor="image_url" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Image URL</label>
                <input
                  type="text"
                  id="image_url"
                  name="image_url"
                  value={post?.image_url || ""}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 px-3 py-2"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="image_file" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Upload Image</label>
                <input
                  type="file"
                  id="image_file"
                  name="image_file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="mt-1 block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)] file:text-white hover:file:bg-[var(--primary-light)] cursor-pointer"
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-[var(--text-secondary)] flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">{selectedFile.name}</span>
                    <span className="text-[var(--primary)]">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                    {selectedFile.size > 5 * 1024 * 1024 && (
                      <span className="text-red-500 font-medium">- File too large (max 5MB)</span>
                    )}
                  </p>
                )}
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

            <button type="submit" className="w-full bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md">
              Update Post
            </button>
          </form>

          {/* Delete Button (outside form) */}
          <button
            onClick={handleDelete}
            className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
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