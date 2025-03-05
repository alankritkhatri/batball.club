import { useState, useEffect } from "react";
import "./MainContent.css";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const MainContent = () => {
  const navigate = useNavigate();
  const { user, openLoginModal } = useAuth();
  const [newsItems, setNewsItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const fetchCricketNews = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/news?q=cricket&language=en&sortBy=publishedAt&pageSize=10&page=${page}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "error") {
        throw new Error(data.message || "Error fetching news");
      }

      if (data.articles) {
        if (page === 1) {
          setNewsItems(formatNewsData(data.articles));
        } else {
          setNewsItems((prev) => [...prev, ...formatNewsData(data.articles)]);
        }
        setHasMore(data.articles.length === 10);
      }
    } catch (error) {
      console.error("Error fetching cricket news:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatNewsData = (articles) => {
    return articles.map((article) => ({
      date: new Date(article.publishedAt).toLocaleDateString(),
      title: article.title,
      image: article.urlToImage,
      url: article.url,
      source: article.source.name,
      comments: Math.floor(Math.random() * 100) + 1, // Placeholder for comments
    }));
  };

  useEffect(() => {
    fetchCricketNews();
  }, [page]);

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  const groupNewsByDate = () => {
    const grouped = {};
    newsItems.forEach((item) => {
      if (!grouped[item.date]) {
        grouped[item.date] = [];
      }
      grouped[item.date].push(item);
    });
    return grouped;
  };

  const groupedNews = groupNewsByDate();

  const handleCreatePost = () => {
    if (!user) {
      openLoginModal("Please log in or register to create a new post");
    } else {
      navigate("/create-post");
    }
  };

  return (
    <div className="main-content">
      <div className="create-post-section">
        <button className="create-post-button" onClick={handleCreatePost}>
          Create New Post
        </button>
      </div>
      {error && <div className="error-message">Error: {error}</div>}

      {Object.entries(groupedNews).map(([date, news], index) => (
        <div key={index} className="news-day">
          <div className="date-header">
            <span className="date">{date}</span>
            {date === new Date().toLocaleDateString() && (
              <span className="today-tag">TODAY</span>
            )}
          </div>

          {news.map((item, newsIndex) => (
            <a
              key={newsIndex}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="news-item"
            >
              {item.image && (
                <div className="news-image">
                  <img src={item.image} alt={item.title} />
                </div>
              )}
              <div className="news-info">
                <h2 className="news-title">{item.title}</h2>
                <div className="news-meta">
                  <span className="source">{item.source}</span>
                  <span className="comments-count">{item.comments}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      ))}

      {hasMore && (
        <div className="load-more">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="load-more-button"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
};

export default MainContent;
