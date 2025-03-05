const express = require("express");
const router = express.Router();
const axios = require("axios");
const rateLimit = require("express-rate-limit");

// Custom error class for API errors
class APIError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.details = details;
  }
}

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    status: "error",
    code: 429,
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
router.use(limiter);

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Validation middleware
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;

  if (page < 1) {
    throw new APIError("Page number must be greater than 0", 400);
  }

  if (limit < 1 || limit > 50) {
    throw new APIError("Limit must be between 1 and 50", 400);
  }

  req.pagination = { page, limit };
  next();
};

// Increase cache duration to reduce API calls
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Expand cache to store all types of data
const cache = {
  matches: {
    data: null,
    timestamp: null,
  },
  liveMatches: {
    data: null,
    timestamp: null,
  },
  matchDetails: {}, // Store by matchId
};

// Helper function to check if cache is valid
const isCacheValid = (cacheEntry) => {
  return (
    cacheEntry.data &&
    cacheEntry.timestamp &&
    Date.now() - cacheEntry.timestamp < CACHE_DURATION
  );
};

// Create axios instance with retry logic and timeout
const cricbuzzApi = axios.create({
  baseURL: "https://cricbuzz-cricket.p.rapidapi.com",
  headers: {
    "X-RapidAPI-Key": process.env.CRICBUZZ_API_KEY,
    "X-RapidAPI-Host": "cricbuzz-cricket.p.rapidapi.com",
  },
  timeout: 10000, // 10 second timeout
});

// Add response interceptor for error handling
cricbuzzApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      throw new APIError(
        "External API error",
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      // The request was made but no response was received
      throw new APIError("No response from external API", 503, {
        timeout: error.timeout,
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new APIError("Error setting up the request", 500, {
        message: error.message,
      });
    }
  }
);

// Helper function to transform match data
const transformMatchData = (match) => ({
  id: match.id,
  name: `${match.team1.name} vs ${match.team2.name}`,
  matchType: match.matchFormat,
  venue: `${match.venue.name}, ${match.venue.city}`,
  dateTimeGMT: match.startTime,
  status: match.status,
  isLive: match.state === "In Progress",
  score: match.score
    ? [
        {
          r: match.score.team1.innings[0]?.runs || 0,
          w: match.score.team1.innings[0]?.wickets || 0,
          o: match.score.team1.innings[0]?.overs || 0,
        },
        {
          r: match.score.team2.innings[0]?.runs || 0,
          w: match.score.team2.innings[0]?.wickets || 0,
          o: match.score.team2.innings[0]?.overs || 0,
        },
      ]
    : null,
});

// Helper function to check if a match is a trophy match
const isTrophyMatch = (match) => {
  const trophyKeywords = ["trophy", "cup", "world cup", "championship", "icc"];
  const matchName = match.name.toLowerCase();
  const matchType = match.matchType?.toLowerCase() || "";

  return trophyKeywords.some(
    (keyword) => matchName.includes(keyword) || matchType.includes(keyword)
  );
};

// Get all matches (live, upcoming, and recent)
router.get(
  "/matches",
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.pagination;
    const matchType = req.query.type || "all";

    try {
      // Check cache first
      if (isCacheValid(cache.matches)) {
        console.log("Serving matches from cache");
        const matches = filterAndPaginateMatches(
          cache.matches.data.filter(isTrophyMatch),
          matchType,
          page,
          limit
        );
        return res.json(matches);
      }

      // Fetch matches from Cricbuzz API with timeout and retry logic
      const [liveMatches, recentMatches, upcomingMatches] = await Promise.all([
        cricbuzzApi.get("/matches/v1/live"),
        cricbuzzApi.get("/matches/v1/recent"),
        cricbuzzApi.get("/matches/v1/upcoming"),
      ]);

      // Combine and transform all matches
      const allMatches = [
        ...liveMatches.data.matches.map((match) => ({
          ...match,
          state: "In Progress",
        })),
        ...recentMatches.data.matches.map((match) => ({
          ...match,
          state: "Completed",
        })),
        ...upcomingMatches.data.matches.map((match) => ({
          ...match,
          state: "Upcoming",
        })),
      ]
        .map(transformMatchData)
        .filter(isTrophyMatch);

      // Cache the combined data
      cache.matches = {
        data: allMatches,
        timestamp: Date.now(),
      };

      // Filter and paginate matches
      const matches = filterAndPaginateMatches(
        allMatches,
        matchType,
        page,
        limit
      );
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);

      // If cache exists but expired, use it as fallback
      if (cache.matches?.data) {
        console.log("Using expired cache as fallback");
        const matches = filterAndPaginateMatches(
          cache.matches.data.filter(isTrophyMatch),
          matchType,
          page,
          limit
        );
        return res.json({
          matches,
          _meta: {
            cached: true,
            expired: true,
            error: error.message,
          },
        });
      }

      // If it's an APIError, use its status and details
      if (error instanceof APIError) {
        return res.status(error.status).json({
          status: "error",
          code: error.status,
          message: error.message,
          details: error.details,
        });
      }

      // For unknown errors, return 500
      res.status(500).json({
        status: "error",
        code: 500,
        message: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  })
);

// Helper function to filter and paginate matches
function filterAndPaginateMatches(matches, type, page, limit) {
  let filteredMatches = [...matches];

  // Filter by type
  switch (type) {
    case "live":
      filteredMatches = matches.filter((m) => m.isLive);
      break;
    case "upcoming":
      filteredMatches = matches.filter(
        (m) => !m.isLive && new Date(m.dateTimeGMT) > new Date()
      );
      break;
    case "recent":
      filteredMatches = matches.filter(
        (m) => !m.isLive && new Date(m.dateTimeGMT) <= new Date()
      );
      break;
  }

  // Sort matches: Live first, then by date
  filteredMatches.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return new Date(b.dateTimeGMT) - new Date(a.dateTimeGMT);
  });

  // Calculate pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = filteredMatches.length;

  return {
    matches: filteredMatches.slice(startIndex, endIndex),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: endIndex < total,
    },
  };
}

// Get match details
router.get("/matches/:matchId", async (req, res) => {
  try {
    const { matchId } = req.params;

    // Check cache first
    if (
      cache.matchDetails[matchId] &&
      isCacheValid(cache.matchDetails[matchId])
    ) {
      console.log(`Serving match ${matchId} from cache`);
      return res.json(cache.matchDetails[matchId].data);
    }

    const response = await cricbuzzApi.get(`/matches/v1/${matchId}`);
    const matchData = transformMatchData(response.data);

    // Cache the match data
    cache.matchDetails[matchId] = {
      data: matchData,
      timestamp: Date.now(),
    };

    res.json(matchData);
  } catch (error) {
    console.error(
      `Error fetching match ${req.params.matchId}:`,
      error.response?.data || error.message
    );

    // If cache exists but expired, use it as fallback
    if (cache.matchDetails[req.params.matchId]?.data) {
      console.log("Using expired match details cache as fallback");
      return res.json(cache.matchDetails[req.params.matchId].data);
    }

    res.status(error.response?.status || 500).json({
      error: "Failed to fetch match details",
      details: error.response?.data?.message || error.message,
    });
  }
});

// Error handling middleware (should be last)
router.use((err, req, res, next) => {
  console.error(err);

  if (err instanceof APIError) {
    return res.status(err.status).json({
      status: "error",
      code: err.status,
      message: err.message,
      details: err.details,
    });
  }

  res.status(500).json({
    status: "error",
    code: 500,
    message: "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

module.exports = router;
