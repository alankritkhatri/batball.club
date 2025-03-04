import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthModal from "../Auth/AuthModal";
import "./Forum.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMessage, setAuthMessage] = useState(
    "Please log in or register to create a new post."
  );

  useEffect(() => {
    // Check if user is logged in when component mounts
    if (!user) {
      setShowAuthModal(true);
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError("Please log in to create a post");
      setAuthMessage("You need to be logged in to create a post.");
      setShowAuthModal(true);
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create post");
      }

      navigate(`/post/${data._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const handleAuthClose = () => {
    navigate("/forum");
  };

  // Show auth modal for logged out users
  if (!user && showAuthModal) {
    return (
      <AuthModal
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
        message={authMessage}
      />
    );
  }

  return (
    <div className="post-page">
      <div className="post-page-container">
        <div className="post-navigation">
          <Link to="/forum" className="back-to-forum">
            ← Back to Forum
          </Link>
        </div>
        <div className="create-post">
          <h1>Create New Post</h1>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit} className="post-form">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Enter a descriptive title"
                className="post-input"
                disabled={loading}
                maxLength={200}
              />
            </div>
            <div className="form-group">
              <label htmlFor="content">Content</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                required
                placeholder="Write your post content here..."
                className="post-textarea"
                rows="15"
                disabled={loading}
                maxLength={10000}
              />
            </div>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? "Creating..." : "Create Post"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
