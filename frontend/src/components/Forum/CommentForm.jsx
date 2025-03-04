import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "./Forum.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CommentForm = ({ postId, onCommentAdded }) => {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [guestUsername, setGuestUsername] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/posts/${postId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(user && {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            }),
          },
          body: JSON.stringify({
            text,
            ...(user ? {} : { guestUsername }),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to post comment");
      }

      const newComment = await response.json();
      onCommentAdded(newComment);
      setText("");
      setGuestUsername("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <h3>Add a Comment</h3>
      {!user && (
        <div className="form-group">
          <input
            type="text"
            value={guestUsername}
            onChange={(e) => setGuestUsername(e.target.value)}
            placeholder="Enter your name (optional)"
            className="post-input"
          />
        </div>
      )}
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
      <button
        type="submit"
        className="submit-button"
        disabled={isSubmitting || (!user && !text)}
      >
        {isSubmitting ? "Posting..." : "Post Comment"}
      </button>
    </form>
  );
};

export default CommentForm;
