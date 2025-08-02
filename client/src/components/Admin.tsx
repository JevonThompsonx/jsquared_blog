// client/src/components/Admin.tsx

import { useState, FC } from "react";
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

const Admin: FC = () => {
  const { user } = useAuth();
  const [post, setPost] = useState<Omit<Post, "id" | "created_at" | "author_id">>({
    title: "",
    description: "",
    image_url: "",
    category: "",
    type: "split-vertical",
    grid_class: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPost((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...post, author_id: user.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      // Clear the form
      setPost({
        title: "",
        description: "",
        image_url: "",
        category: "",
        type: "split-vertical",
        grid_class: "",
      });

      alert("Post created successfully!");
    } catch (error) {
      console.error(error);
      alert("Error creating post");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create Post</h1>
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
          Create Post
        </button>
      </form>
    </div>
  );
};

export default Admin;
