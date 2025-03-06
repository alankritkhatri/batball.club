import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";
import { useAuth } from "../../context/AuthContext";
import { Analytics } from "@vercel/analytics/react";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Create a context for forum state management
export const ForumContext = React.createContext();

const Sidebar = () => {
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { user, openLoginModal } = useAuth();
  const isForumPage =
    location.pathname === "/forum" || location.pathname === "/";

  useEffect(() => {
    fetchRecentPosts();
  }, []);

  const fetchRecentPosts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts`);
      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }
      const data = await response.json();
      setRecentPosts(data.slice(0, 7));
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch recent posts:", error);
      setLoading(false);
    }
  };

  const handleCreatePost = () => {
    if (!user) {
      openLoginModal("Please log in or register to create a new post");
      return;
    }

    // If we're on the forum page, dispatch a custom event to show the create post form
    if (isForumPage) {
      const event = new CustomEvent("showCreatePostForm");
      window.dispatchEvent(event);
    } else {
      // If we're not on the forum page, navigate to the forum page with a query parameter
      window.location.href = "/forum?showCreatePost=true";
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-section create-post-sidebar-section">
        <button className="create-post-sidebar-button">
          <a style={{ textDecoration: "none", color: "white" }} href="/forum">
            Create New Post
          </a>
        </button>
      </div>
      <div style={{ margin: "8px" }} className="sidebar-section">
        <h3 style={{ fontSize: "14px" }} className="section-title">
          RECENT DISCUSSION IN FORUMs
        </h3>
        <ul className="thread-list">
          {loading ? (
            <li className="thread-item loading">Loading...</li>
          ) : (
            recentPosts.map((post) => (
              <li key={post._id} className="thread-item">
                <Link to={`/post/${post._id}`} className="thread-link">
                  <span className="thread-title">{post.title}</span>
                  <span className="thread-count">
                    {post.comments?.length || 0}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
