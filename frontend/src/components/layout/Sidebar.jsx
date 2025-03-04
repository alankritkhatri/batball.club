import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Sidebar = () => {
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <h3 className="section-title">RECENT DISCUSSION</h3>
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
