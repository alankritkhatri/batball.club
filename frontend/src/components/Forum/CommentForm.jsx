import React, { useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import "./Forum.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CommentForm = ({ postId, onCommentAdded }) => {
  const { user, guestName, openGuestModal, openLoginModal } = useAuth();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // If not logged in and no guest name, prompt for guest name
    if (!user && !guestName) {
      openGuestModal(guestSubmitCallback);
      return;
    }

    await submitComment();
  };

  const submitComment = async () => {
    if (!text.trim()) {
      setError("Comment cannot be empty");
      return;
    }

    setIsSubmitting(true);

    try {
      const headers = {
        "Content-Type": "application/json",
      };

      // Add authorization header if user is logged in
      if (user) {
        headers.Authorization = `Bearer ${localStorage.getItem("token")}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/posts/${postId}/comments`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            text,
            // Include guest name if not logged in
            ...(user ? {} : { guestUsername: guestName }),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to post comment");
      }

      const newComment = await response.json();
      onCommentAdded(newComment);
      setText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Define the callback function after submitComment is defined
  const guestSubmitCallback = useCallback(() => {
    submitComment();
  }, [submitComment]); // Include submitComment as a dependency

  const handleLoginClick = () => {
    openLoginModal("Login to comment with your account");
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <h3>Add a Comment</h3>
      <div className="form-group">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your comment..."
          required
          className="post-textarea"
        />
      </div>
      {error && <div className="error-message">{error}</div>}

      <div className="comment-form-actions">
        {!user && guestName && (
          <div className="guest-info-with-login">
            <div className="guest-info">
              Commenting as guest: <strong>{guestName}</strong>
            </div>
            <button
              type="button"
              className="login-link-btn"
              onClick={handleLoginClick}
            >
              Switch to account
            </button>
          </div>
        )}

        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? "Posting..." : "Post Comment"}
        </button>
      </div>

      {!user && !guestName && (
        <div className="guest-option">
          <button
            type="button"
            onClick={() => openGuestModal()}
            className="guest-button"
          >
            Continue as Guest
          </button>
          <span className="or-divider">or</span>
          <button
            type="button"
            onClick={handleLoginClick}
            className="login-button"
          >
            Login to Comment
          </button>
        </div>
      )}
    </form>
  );
};

export default CommentForm;
