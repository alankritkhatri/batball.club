import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthModal from "../Auth/AuthModal";
import "./Forum.css";
import AppLayout from "../layout/AppLayout";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Modular CreatePost component without white background
const CreatePost = ({ inline = false, onCancel }) => {
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

      // Get token from localStorage
      const token = localStorage.getItem("token");

      // Log token for debugging
      console.log("Using token for post creation:", token);

      if (!token) {
        throw new Error(
          "Authentication token is missing. Please log in again."
        );
      }

      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
        }),
      });

      // Log response status for debugging
      console.log("Post creation response status:", response.status);

      const data = await response.json();

      // Log response data for debugging
      console.log("Post creation response data:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to create post");
      }

      if (inline) {
        if (onCancel) onCancel();
      } else {
        navigate(`/post/${data._id}`);
      }
    } catch (err) {
      console.error("Error creating post:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const handleAuthClose = () => {
    if (inline) {
      if (onCancel) onCancel();
    } else {
      navigate("/forum");
    }
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

  const formContent = (
    <>
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
          <small className="char-count">{formData.title.length}/200</small>
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
            rows="12"
            disabled={loading}
            maxLength={10000}
          />
          <small className="char-count">{formData.content.length}/10000</small>
        </div>
        <div className="form-actions">
          {inline ? (
            <button type="button" className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
          ) : (
            <Link to="/forum" className="cancel-button">
              Cancel
            </Link>
          )}
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? (
              <span className="loading-spinner">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="spinner"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                Creating...
              </span>
            ) : (
              "Create Post"
            )}
          </button>
        </div>
      </form>
    </>
  );

  // If this is an inline component (used within another page), don't wrap with AppLayout
  if (inline) {
    return (
      <div className="create-post-container">
        <h2>Create New Post</h2>
        {formContent}
      </div>
    );
  }

  // For standalone page, wrap with AppLayout
  return (
    <AppLayout>
      <div className="create-post-container">
        <div className="post-navigation">
          <Link to="/forum" className="back-to-forum">
            ← Back to Forum
          </Link>
        </div>
        <h2>Create New Post</h2>
        {formContent}
      </div>
    </AppLayout>
  );
};

export default CreatePost;
