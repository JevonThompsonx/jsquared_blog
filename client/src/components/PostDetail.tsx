// client/src/components/PostDetail.tsx

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Get user from auth context

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

  if (loading) {
    return <div className="container mx-auto p-4 text-center text-gray-700">Loading post...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
  }

  if (!post) {
    return <div className="container mx-auto p-4 text-center text-gray-700">Post not found.</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl bg-white shadow-lg rounded-lg my-8">
      {user && user.role === "admin" && (
        <div className="flex justify-end mb-4">
          <Link
            to={`/posts/${post.id}/edit`}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Edit Post
          </Link>
        </div>
      )}
      {post.image_url && (
        <img
          src={post.image_url}
          alt={post.title || "Post image"}
          className="w-full h-64 object-cover rounded-t-lg mb-6"
        />
      )}
      <h1 className="text-4xl font-bold text-gray-800 mb-4">{post.title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Category: {post.category || "Uncategorized"} | Type: {post.type}
      </p>
      <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
        {post.description}
      </p>
      {/* Add more post details here as needed */}
    </div>
  );
};

export default PostDetail;
