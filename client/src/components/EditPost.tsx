

import { useState, useEffect, FC } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { Post } from "../../../shared/src/types";

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
    type: "horizontal",
    created_at: new Date().toISOString(),
    author_id: ""
  }));
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  

  useEffect(() => {
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
      } catch (e: any) {
        console.error("Error fetching post in EditPost.tsx:", e);
      } finally {
      }
    };

    fetchPost();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPost((prev) => ({ ...prev, [name]: value } as Post));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setPost((prev) => ({ ...prev, image_url: null } as Post));
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token || !post) return;

    let bodyContent;
    let headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
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
      bodyContent = formData;
    } else {
      if (!post.image_url) {
        alert("Please enter an image URL or select a file.");
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
    <>
      
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold mb-4">Edit Post</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={post?.title || ""}
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
                value={post?.description || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Image Source</label>
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
                  <span className="ml-2 text-sm">Image URL</span>
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
                  <span className="ml-2 text-sm">Upload File</span>
                </label>
              </div>
            </div>

            {uploadMethod === 'url' ? (
              <div>
                <label htmlFor="image_url" className="block text-sm font-medium">Image URL</label>
                <input
                  type="text"
                  id="image_url"
                  name="image_url"
                  value={post?.image_url || ""}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="image_file" className="block text-sm font-medium">Upload Image</label>
                <input
                  type="file"
                  id="image_file"
                  name="image_file"
                  accept="image/*"
                  onChange={handleFileChange} // New handler
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            )}
            <div>
              <label htmlFor="category" className="block text-sm font-medium">Category</label>
              <input
                type="text"
                id="category"
                name="category"
                value={post?.category || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            
            <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Update Post
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditPost;