

import { useState, FC } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useOutletContext } from "react-router-dom";

import { ThemeName } from "../../../shared/src/types";

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
};

const Admin: FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  

  const [post, setPost] = useState<Omit<Post, "id" | "created_at" | "author_id">>({
    title: "",
    description: "",
    image_url: "",
    category: "",
  });

  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useOutletContext<AdminProps>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPost((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
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
      <div className="container mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">Create New Post</h1>
        <div className="bg-[var(--card-bg)] shadow-xl rounded-lg border border-[var(--border)] p-6 sm:p-8">
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
              <textarea
                id="description"
                name="description"
                value={post.description || ""}
                onChange={handleChange}
                rows={6}
                className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 px-3 py-2"
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
              <input
                type="text"
                id="category"
                name="category"
                value={post.category || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50 px-3 py-2"
              />
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