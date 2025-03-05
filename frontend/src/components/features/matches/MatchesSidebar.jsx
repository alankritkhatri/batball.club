import React, { useState, useEffect, useCallback } from "react";
import LoadingSpinner from "../../common/LoadingSpinner";
import "./MatchesSidebar.css";

// API configuration
const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  CACHE_DURATION: 300000, // 5 minutes in milliseconds
};

const MATCH_TYPES = [
  { id: "all", label: "All Trophy Matches" },
  { id: "live", label: "Live Trophy Matches" },
  { id: "upcoming", label: "Upcoming Trophy Matches" },
  { id: "recent", label: "Recent Trophy Matches" },
];

const MatchesSidebar = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedType, setSelectedType] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // Base delay of 2 seconds

  // Get cached data from localStorage
  const getCachedData = (key) => {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > API_CONFIG.CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }
      return data;
    } catch (error) {
      console.error("Error parsing cached data:", error);
      localStorage.removeItem(key);
      return null;
    }
  };

  // Set data in localStorage cache
  const setCachedData = (key, data) => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error("Error caching data:", error);
    }
  };

  // Add error message mapping
  const getErrorMessage = (status, message) => {
    const errorMessages = {
      429: "Too many requests. Please wait a moment before trying again...",
      500: "Server is experiencing issues. Please try again later.",
      404: "Could not find the requested matches.",
      401: "Authentication error. Please log in again.",
      403: "You don't have permission to access this resource.",
      default: "An unexpected error occurred. Please try again later.",
    };

    if (message?.toLowerCase().includes("network")) {
      return "Network error. Please check your internet connection.";
    }

    return errorMessages[status] || errorMessages.default;
  };

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cacheKey = `matches_${selectedType}`;
      const cachedData = getCachedData(cacheKey);

      if (cachedData) {
        setMatches(cachedData.matches);
        setPagination(cachedData.pagination);
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/cricket/matches?type=${selectedType}&page=${pagination.page}&limit=${pagination.limit}`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10 second timeout
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || getErrorMessage(response.status));
      }

      const data = await response.json();

      if (!data.matches || !Array.isArray(data.matches)) {
        throw new Error("Invalid data format received from server");
      }

      // Update state with new data
      setMatches(data.matches);
      setPagination(data.pagination);
      setRetryCount(0); // Reset retry count on successful fetch

      // Cache the results
      setCachedData(cacheKey, {
        matches: data.matches,
        pagination: data.pagination,
      });
    } catch (error) {
      console.error("Error fetching matches:", error);
      const errorMessage = getErrorMessage(error.status, error.message);
      setError(errorMessage);

      // Implement retry logic with exponential backoff
      if (
        retryCount < MAX_RETRIES &&
        !error.message?.includes("Too many requests")
      ) {
        const delay = Math.min(RETRY_DELAY * Math.pow(2, retryCount), 30000);
        console.log(
          `Retrying in ${delay / 1000} seconds... (Attempt ${
            retryCount + 1
          }/${MAX_RETRIES})`
        );

        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
        }, delay);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedType, pagination.page, pagination.limit, retryCount]);

  useEffect(() => {
    fetchMatches();

    // Adjust the refresh interval to 30 seconds for development, adjust as needed for production
    const refreshInterval = setInterval(() => {
      if (!loading && !error) {
        // Only refresh if not loading and no error
        fetchMatches();
      }
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [fetchMatches]);

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page when changing type
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const formatScore = (score) => {
    if (!score || !Array.isArray(score) || score.length === 0) return "";
    return score.map((s) => `${s.r}/${s.w} (${s.o})`).join(" | ");
  };

  // Add error UI component
  const ErrorMessage = ({ message, onRetry }) => (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">{message}</p>
        </div>
        {onRetry && (
          <div className="ml-auto pl-3">
            <button
              onClick={onRetry}
              className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md text-sm font-medium"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="matches-sidebar">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="matches-sidebar error">
        <ErrorMessage
          message={error}
          onRetry={() => {
            setRetryCount(0);
            setError(null);
            fetchMatches();
          }}
        />
      </div>
    );
  }

  return (
    <div className="matches-sidebar">
      <div className="matches-header">
        <h2>Cricket Matches</h2>
        <div className="match-type-filters">
          {MATCH_TYPES.map((type) => (
            <button
              key={type.id}
              className={`type-filter-btn ${
                selectedType === type.id ? "active" : ""
              }`}
              onClick={() => handleTypeChange(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="matches-list">
        {matches.map((match) => (
          <div
            key={match.id}
            className={`match-card ${match.isLive ? "live" : ""}`}
          >
            <div className="match-header">
              <span className={`match-type ${match.matchType?.toLowerCase()}`}>
                {match.matchType}
              </span>
              {match.isLive && <span className="live-indicator">LIVE</span>}
            </div>
            <h3>{match.name}</h3>
            <div className="match-venue">{match.venue}</div>
            <div className="match-time">
              {new Date(match.dateTimeGMT).toLocaleString()}
            </div>
            {match.score && (
              <div className="match-score">{formatScore(match.score)}</div>
            )}
            <div className="match-status">{match.status}</div>
          </div>
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={pagination.page === 1}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="page-info">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            className="pagination-btn"
            disabled={!pagination.hasMore}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MatchesSidebar;
