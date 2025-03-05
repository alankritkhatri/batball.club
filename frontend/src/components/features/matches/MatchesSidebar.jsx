import React, { useState, useEffect, useCallback } from "react";
import LoadingSpinner from "../../common/LoadingSpinner";
import "./MatchesSidebar.css";

// API configuration
const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL,
  CACHE_DURATION: 300000, // 5 minutes in milliseconds
};

const MatchesSidebar = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [visibleMatches, setVisibleMatches] = useState(3);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const MAX_RETRIES = 3;
  const MATCHES_PER_LOAD = 3;

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

  // Restore visible matches count from localStorage
  useEffect(() => {
    const savedVisibleMatches = localStorage.getItem("visible_matches_count");
    if (savedVisibleMatches) {
      setVisibleMatches(parseInt(savedVisibleMatches, 10));
    }
  }, []);

  // Save visible matches count to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("visible_matches_count", visibleMatches.toString());
  }, [visibleMatches]);

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cachedLiveMatches = getCachedData("live_matches");
      const cachedUpcomingMatches = getCachedData("upcoming_matches");

      let liveData, upcomingData;

      if (cachedLiveMatches && cachedUpcomingMatches) {
        liveData = cachedLiveMatches;
        upcomingData = cachedUpcomingMatches;
      } else {
        // Fetch live and upcoming matches
        const [liveResponse, upcomingResponse] = await Promise.all([
          fetch(`${API_CONFIG.BASE_URL}/matches/live`),
          fetch(`${API_CONFIG.BASE_URL}/matches/upcoming`),
        ]);

        if (!liveResponse.ok || !upcomingResponse.ok) {
          throw new Error("Failed to fetch matches");
        }

        liveData = await liveResponse.json();
        upcomingData = await upcomingResponse.json();

        // Cache the responses
        setCachedData("live_matches", liveData);
        setCachedData("upcoming_matches", upcomingData);
      }

      // Combine and sort matches
      const allMatches = [
        ...liveData.data.map((match) => ({ ...match, isLive: true })),
        ...upcomingData.data.map((match) => ({ ...match, isLive: false })),
      ].sort((a, b) => new Date(a.dateTimeGMT) - new Date(b.dateTimeGMT));

      setMatches(allMatches);
      setCanLoadMore(allMatches.length > visibleMatches);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching matches:", error);
      setError(error.message);

      // Implement retry logic
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
        }, 5000); // Retry after 5 seconds
      }

      setLoading(false);
    }
  }, [retryCount, visibleMatches]);

  useEffect(() => {
    fetchMatches();

    // Set up a refresh interval (every 5 minutes)
    const refreshInterval = setInterval(() => {
      fetchMatches();
    }, API_CONFIG.CACHE_DURATION);

    return () => clearInterval(refreshInterval);
  }, [fetchMatches]);

  const loadMore = () => {
    setVisibleMatches((prev) => prev + MATCHES_PER_LOAD);
    setCanLoadMore(matches.length > visibleMatches + MATCHES_PER_LOAD);
  };

  const formatScore = (score) => {
    if (!score || !Array.isArray(score) || score.length === 0) return "";
    return score.map((s) => `${s.inning}: ${s.r}/${s.w} (${s.o})`).join(" | ");
  };

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
        <p>Error: {error}</p>
        {retryCount < MAX_RETRIES && <p>Retrying...</p>}
      </div>
    );
  }

  return (
    <div className="matches-sidebar">
      <h2>Live & Upcoming Matches</h2>
      <div className="matches-list">
        {matches.slice(0, visibleMatches).map((match) => (
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
      {canLoadMore && (
        <button className="load-more-btn" onClick={loadMore}>
          Load More
        </button>
      )}
    </div>
  );
};

export default MatchesSidebar;
