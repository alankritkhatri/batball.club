import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthModal from "../Auth/AuthModal";
import "./Forum.css";
import AppLayout from "../layout/AppLayout";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Modular CreatePost component without white background
const CreatePost = ({ inline = false, onCancel, onPostCreated }) => {
  const { user, guestName, openGuestModal } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMessage] = useState(
    "Please log in, register, or continue as a guest to create a new post."
  );

  useEffect(() => {
    // Check if user is logged in or has a guest name when component mounts
    if (!user && !guestName) {
      setShowAuthModal(true);
    }
  }, [user, guestName]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // If not logged in and no guest name, prompt for guest name
    if (!user && !guestName) {
      openGuestModal(guestSubmitCallback);
      return;
    }

    await submitPost();
  };

  const submitPost = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = {
        "Content-Type": "application/json",
      };

      // Add authorization header if user is logged in
      if (user) {
        headers.Authorization = `Bearer ${localStorage.getItem("token")}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...formData,
          // Include guest name if not logged in
          ...(user ? {} : { guestUsername: guestName }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create post");
      }

      const newPost = await response.json();
      console.log("Post created:", newPost);

      // Clear form
      setFormData({
        title: "",
        content: "",
      });

      // If inline, call onCancel to close the form
      if (inline) {
        if (onPostCreated) {
          onPostCreated(newPost);
        } else if (onCancel) {
          onCancel();
        }
      } else {
        // Navigate to the new post
        navigate(`/posts/${newPost._id}`);
      }
    } catch (err) {
      console.error("Error creating post:", err);
      setError(err.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  // Define the callback function after submitPost is defined
  const guestSubmitCallback = useCallback(() => {
    submitPost();
  }, [submitPost]);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const handleAuthClose = () => {
    setShowAuthModal(false);
    if (inline && onCancel) {
      onCancel();
    }
  };

  // Determine if we should show the guest option
  const showGuestOption = !user && !guestName;

  return (
    <div className={`create-post-container ${inline ? "inline" : ""}`}>
      <form onSubmit={handleSubmit} className="create-post-form">
        <h2>{inline ? "Create New Post" : "Create a New Post"}</h2>
        <div className="form-group">
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Title"
            className="post-input"
            required
          />
        </div>
        <div className="form-group">
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Write your post content here..."
            className="post-textarea"
            required
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="form-actions">
          {inline && (
            <button
              type="button"
              onClick={onCancel}
              className="cancel-button"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Creating..." : "Create Post"}
          </button>
        </div>
        {!user && guestName && (
          <div className="guest-info">
            Posting as guest: <strong>{guestName}</strong>
          </div>
        )}
        {showGuestOption && (
          <div className="guest-option">
            <button
              type="button"
              onClick={() => openGuestModal()}
              className="guest-button"
            >
              Continue as Guest
            </button>
          </div>
        )}
      </form>
      {showAuthModal && (
        <AuthModal
          onClose={handleAuthClose}
          onSuccess={handleAuthSuccess}
          message={authMessage}
        />
      )}
    </div>
  );
};

export default CreatePost;
