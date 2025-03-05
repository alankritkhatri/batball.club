import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthModal from "../Auth/AuthModal";
import CreatePost from "./CreatePost";
import "./Forum.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Forum = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/posts`);
      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }
      const data = await response.json();
      setPosts(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleCreatePostClick = () => {
    if (user) {
      setShowCreatePost(true);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setShowCreatePost(true);
  };

  const handleCancelCreate = () => {
    setShowCreatePost(false);
  };

  if (loading) {
    return <div className="loading">Loading posts...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button className="retry-button" onClick={fetchPosts}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="forum-container">
      <div className="forum-header">
        <h1>Forum</h1>
        {!showCreatePost && (
          <button
            onClick={handleCreatePostClick}
            className="create-post-button"
          >
            Create New Post
          </button>
        )}
      </div>

      {showCreatePost && (
        <CreatePost inline={true} onCancel={handleCancelCreate} />
      )}

      {posts.length === 0 && !showCreatePost ? (
        <div className="no-posts">
          No posts available. Be the first to create one!
        </div>
      ) : (
        <div className="posts-list">
          {posts.map((post) => (
            <article key={post._id} className="forum-post">
              <Link to={`/post/${post._id}`} className="post-title-link">
                <h2>{post.title}</h2>
              </Link>
              <div className="post-meta">
                <span className="post-author">{post.author.username}</span>
                <span className="post-date">{formatDate(post.createdAt)}</span>
              </div>
              <p className="post-content-preview">
                {post.content.length > 200
                  ? `${post.content.substring(0, 200)}...`
                  : post.content}
              </p>
              <div className="post-footer">
                <div className="post-stats">
                  {post.comments?.length || 0} comments
                </div>
                <Link to={`/post/${post._id}`} className="read-more-button">
                  Read More
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          message="Please log in or register to create a new post."
        />
      )}
    </div>
  );
};

export default Forum;
