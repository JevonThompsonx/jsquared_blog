// client/src/components/EditPost.tsx

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// This type should match what your API returns from the 'posts' table
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

const EditPost = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [post, setPost] = useState<Omit<Post, "created_at" | "author_id"> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPost((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token || !post) return;

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(post),
      });

      if (!response.ok) {
        throw new Error("Failed to update post");
      }

      alert("Post updated successfully!");
      navigate(`/posts/${id}`); // Redirect back to the post detail page
    } catch (err: any) {
      console.error(err);
      alert("Error updating post");
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center text-gray-700">Loading post for editing...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
  }

  if (!post) {
    return <div className="container mx-auto p-4 text-center text-gray-700">Post not found for editing.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Post</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={post.title}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium">Description</label>
          <textarea
            id="description"
            name="description"
            value={post.description || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="image_url" className="block text-sm font-medium">Image URL</label>
          <input
            type="text"
            id="image_url"
            name="image_url"
            value={post.image_url || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium">Category</label>
          <input
            type="text"
            id="category"
            name="category"
            value={post.category || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium">Type</label>
          <select
            id="type"
            name="type"
            value={post.type}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="split-vertical">Split Vertical</option>
            <option value="split-horizontal">Split Horizontal</option>
            <option value="hover">Hover</option>
          </select>
        </div>
        <div>
          <label htmlFor="grid_class" className="block text-sm font-medium">Grid Class</label>
          <input
            type="text"
            id="grid_class"
            name="grid_class"
            value={post.grid_class || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Update Post
        </button>
      </form>
    </div>
  );
};

export default EditPost;
