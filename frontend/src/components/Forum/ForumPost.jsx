import React from "react";
import "./Forum.css";

const ForumPost = ({ post, onDelete, currentUser }) => {
  const formattedDate = new Date(post.createdAt).toLocaleDateString();
  const canDelete = currentUser && currentUser.id === post.authorId;

  return (
    <div className="forum-post">
      <div className="post-header">
        <div className="post-info">
          <h3 className="post-title">{post.title}</h3>
          <div className="post-meta">
            <span className="post-author">Posted by {post.author}</span>
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
      <div className="post-footer">
        <div className="post-stats">
          <span className="post-comments">
            {post.commentCount || 0} comments
          </span>
          <span className="post-likes">{post.likes || 0} likes</span>
        </div>
      </div>
    </div>
  );
};

export default ForumPost;
