

import { useState, FC } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useOutletContext } from "react-router-dom";

import { ThemeName, CATEGORIES } from "../../../shared/src/types";
import RichTextEditor from "./RichTextEditor";

interface AdminProps {
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
  author_id: string;
  type: "split-horizontal" | "split-vertical" | "hover";
  status: "draft" | "published";
};

const Admin: FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();


  const [post, setPost] = useState<Omit<Post, "id" | "created_at" | "author_id">>({
    title: "",
    description: "",
    image_url: "",
    category: "",
    type: "split-vertical" as const,
    status: "published" as const,
  });

  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleMessage, setShuffleMessage] = useState<string | null>(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryValue, setCustomCategoryValue] = useState("");

  useOutletContext<AdminProps>();

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
    }
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

    let bodyContent;
    let headers: HeadersInit = {
      Authorization: `Bearer ${user.token}`,
    };

    if (uploadMethod === 'file') {
      if (!selectedFile) {
        alert("Please select an image file to upload.");
        return;
      }
      const formData = new FormData();
      formData.append('title', post.title);
      formData.append('description', post.description || '');
      formData.append('category', post.category || '');
      formData.append('status', post.status);
      formData.append('image', selectedFile);
      formData.append('author_id', user.id);

      bodyContent = formData;
    } else {
      if (!post.image_url) {
        alert("Please enter an image URL.");
        return;
      }
      bodyContent = JSON.stringify({ ...post, author_id: user.id });
      headers['Content-Type'] = 'application/json';
    }

    try {
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

      setPost({
        title: "",
        description: "",
        image_url: "",
        category: "",
        type: "split-vertical",
        status: "published",
      });
      setSelectedFile(null);

      alert("Post created successfully!");
      if (newPost && newPost.length > 0) {
        navigate(`/posts/${newPost[0].id}`);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Error creating post: ${error.message}`);
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
              <label htmlFor="title" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={post.title}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 px-3 py-2"
                required
              />
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
                  value={post.image_url || ""}
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
              </select>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Drafts are only visible to admins. Published posts are visible to everyone.
              </p>
            </div>

            <button type="submit" className="w-full bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md">
              Create Post
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Admin;