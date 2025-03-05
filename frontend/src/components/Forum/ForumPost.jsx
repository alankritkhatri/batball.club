import React, { useState } from "react";
import "./Forum.css";

const ForumPost = ({ post, onDelete, currentUser }) => {
  const [commentText, setCommentText] = useState("");
  const formattedDate = new Date(post.createdAt).toLocaleString();
  const canDelete = currentUser && currentUser.id === post.authorId;

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    // Add your comment submission logic here
    console.log("Comment submitted:", commentText);
    setCommentText("");
  };

  return (
    <div className="forum-post">
      <div className="post-header">
        <div className="post-vote">
          <button className="vote-up">▲</button>
          <span className="vote-count">{post.votes || 0}</span>
          <button className="vote-down">▼</button>
        </div>
        <div className="post-info">
          <h2 className="post-title">{post.title || post.username}</h2>
          <div className="post-meta">
            <a href={`mailto:${post.email}`} className="post-email">
              {post.email}
            </a>
            <span className="post-date">{formattedDate}</span>
          </div>
        </div>
        {canDelete && (
          <button className="delete-button" onClick={() => onDelete(post._id)}>
            Delete
          </button>
        )}
      </div>
      <div className="post-content">{post.content}</div>

      <div className="comments-section">
        <h3>Comments</h3>
        {post.comments && post.comments.length > 0 ? (
          <div className="comments-list">
            {post.comments.map((comment, index) => (
              <div key={comment._id || index} className="comment">
                <div className="comment-header">
                  <span className="comment-author">{comment.username}</span>
                  <span className="comment-date">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="comment-content">{comment.text}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-comments">No comments yet</p>
        )}

        <div className="add-comment">
          <h4>Add a Comment</h4>
          <form onSubmit={handleCommentSubmit}>
            <textarea
              className="comment-textarea"
              placeholder="Write your comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              required
            />
            <button type="submit" className="post-comment-btn">
              Post Comment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForumPost;
