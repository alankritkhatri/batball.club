import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import CommentForm from "./CommentForm";
import "./Forum.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Post = ({ postId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [voteCount, setVoteCount] = useState(0);

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch post");
      }
      const data = await response.json();
      setPost(data);
      setVoteCount(data.votes || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (direction) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ direction }),
      });

      if (!response.ok) {
        throw new Error("Failed to vote");
      }

      const data = await response.json();
      setVoteCount(data.votes);
    } catch (err) {
      console.error("Error voting:", err);
    }
  };

  if (loading) {
    return (
      <div className="forum-container">
        <div className="loading">Loading post...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="forum-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="forum-container">
        <div className="error-message">Post not found</div>
      </div>
    );
  }

  return (
    <div className="forum-container">
      <div className="thread-navigation">
        <Link to="/forum" className="nav-link">
          Forums
        </Link>
        <span className="nav-separator">/</span>
        <Link to="/forum/general" className="nav-link">
          General Discussion
        </Link>
      </div>

      <article className="post-item">
        <div className="post-item-header">
          <div className="vote-system">
            <button
              className="vote-button"
              onClick={() => handleVote("up")}
              disabled={!user}
            >
              ▲
            </button>
            <span className="vote-count">{voteCount}</span>
            <button
              className="vote-button"
              onClick={() => handleVote("down")}
              disabled={!user}
            >
              ▼
            </button>
          </div>
          <h1 className="post-item-title">{post.title}</h1>
          <div className="post-item-meta">
            <div className="post-author">
              {post.author?.username || "Anonymous"}
            </div>
            <span>{new Date(post.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <div className="post-item-content">{post.content}</div>
      </article>

      <div className="comments-section">
        <h3>Comments</h3>
        {post.comments?.map((comment) => (
          <div key={comment._id} className="comment">
            <div className="comment-header">
              <div className="comment-author">
                {comment.user?.username || comment.guestUsername || "Anonymous"}
              </div>
              <span className="comment-date">
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="comment-content">{comment.text}</div>
          </div>
        ))}

        <CommentForm
          postId={postId}
          onCommentAdded={(newComment) =>
            setPost((prev) => ({
              ...prev,
              comments: [...(prev.comments || []), newComment],
            }))
          }
        />
      </div>
    </div>
  );
};

export default Post;
