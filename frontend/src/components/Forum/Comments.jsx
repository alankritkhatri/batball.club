import React from "react";
import "./Forum.css";

const Comments = ({ comments }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!Array.isArray(comments) || comments.length === 0) {
    return (
      <p className="no-comments">No comments yet. Be the first to comment!</p>
    );
  }

  return (
    <div className="comments-section">
      {comments.map((comment, index) => (
        <div key={comment._id || index} className="comment-item">
          <div className="comment-header">
            {comment.user ? (
              <span className="comment-author">
                {comment.username || comment.user.username}
              </span>
            ) : (
              <span className="comment-guest">
                {comment.guestUsername} (Guest)
              </span>
            )}
            <span className="comment-date">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <p className="comment-text">{comment.text}</p>
        </div>
      ))}
    </div>
  );
};

export default Comments;
