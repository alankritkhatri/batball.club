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
  const [initialLoadDone, setInitialLoadDone] = useState(false);
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

  const fetchMatches = useCallback(
    async (forceRefresh = false) => {
      try {
        setLoading(true);
        setError(null);

        let liveData, upcomingData;

        // Check cache first (only if not forcing refresh)
        const cachedLiveMatches = forceRefresh
          ? null
          : getCachedData("live_matches");
        const cachedUpcomingMatches = forceRefresh
          ? null
          : getCachedData("upcoming_matches");

        if (!forceRefresh && cachedLiveMatches && cachedUpcomingMatches) {
          liveData = cachedLiveMatches;
          upcomingData = cachedUpcomingMatches;
        } else {
          // Add a timestamp query parameter to force a fresh request instead of using cache-control header
          const timestamp = Date.now();

          // Fetch live and upcoming matches
          const [liveResponse, upcomingResponse] = await Promise.all([
            fetch(
              `${API_CONFIG.BASE_URL}/api/matches/live${
                forceRefresh ? `?_t=${timestamp}` : ""
              }`
            ),
            fetch(
              `${API_CONFIG.BASE_URL}/api/matches/upcoming${
                forceRefresh ? `?_t=${timestamp}` : ""
              }`
            ),
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
        ].sort((a, b) => {
          // First prioritize Champions Trophy matches
          const isAChampionsTrophy =
            a.seriesName?.includes("Champions Trophy") || false;
          const isBChampionsTrophy =
            b.seriesName?.includes("Champions Trophy") || false;

          if (isAChampionsTrophy && !isBChampionsTrophy) return -1;
          if (!isAChampionsTrophy && isBChampionsTrophy) return 1;

          // Then sort by date for matches of the same type
          return new Date(a.dateTimeGMT) - new Date(b.dateTimeGMT);
        });

        setMatches(allMatches);
        setCanLoadMore(allMatches.length > visibleMatches);
        setLoading(false);
        setInitialLoadDone(true);
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
    },
    [retryCount, visibleMatches]
  );

  useEffect(() => {
    // Only fetch on initial component mount if not already loaded
    if (!initialLoadDone) {
      fetchMatches(false);
    }
    // No automatic refresh intervals
  }, [fetchMatches, initialLoadDone]);

  const loadMore = () => {
    setVisibleMatches((prev) => prev + MATCHES_PER_LOAD);
    setCanLoadMore(matches.length > visibleMatches + MATCHES_PER_LOAD);
  };

  const formatScore = (score) => {
    if (!score || !Array.isArray(score) || score.length === 0) return "";
    return score.map((s) => `${s.team}: ${s.inning}`).join(" | ");
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
      <div className="sidebar-header">
        <h2>Live & Upcoming Matches</h2>
        <button
          className="refresh-btn-top"
          onClick={() => fetchMatches(true)}
          title="Refresh match scores"
        >
          Refresh Scores
        </button>
      </div>
      <div className="matches-list">
        {matches.slice(0, visibleMatches).map((match) => (
          <div
            key={match.id}
            className={`match-card ${match.isLive ? "live" : ""} ${
              match.seriesName?.includes("Champions Trophy")
                ? "champions-trophy"
                : ""
            }`}
          >
            <div className="match-header">
              <div style={{ display: "flex", alignItems: "center" }}>
                {match.isLive && (
                  <span className="match-status-indicator live"></span>
                )}
                {match.seriesName?.includes("Champions Trophy") && (
                  <span className="match-status-indicator champions-trophy"></span>
                )}
                <span
                  className={`match-type ${match.matchType?.toLowerCase()}`}
                >
                  {match.matchType}
                </span>
              </div>
              {match.isLive && <span className="live-indicator">LIVE</span>}
            </div>
            <h3>{match.name}</h3>
            <div className="series-name">{match.seriesName}</div>
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
