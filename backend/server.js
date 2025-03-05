const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const auth = require("./middleware/auth");
const User = require("./models/User");
const Post = require("./models/Post");
require("dotenv").config();
const asyncHandler = require("express-async-handler");

const app = express();
const PORT = process.env.PORT || 5000;
const API_KEY = process.env.CRICKET_DATA_API_KEY;
const CRICKET_DATA_BASE_URL = "https://api.cricapi.com/v1";
const CACHE_TTL = 30; // Cache for 30 seconds to keep live data fresh

// Initialize cache
const cache = new NodeCache({
  stdTTL: CACHE_TTL,
  checkperiod: 2,
  deleteOnExpire: true,
});

// Mock scores data store
const mockScores = new Map();

// Function to generate random score updates
const generateMockScore = (matchId) => {
  if (!mockScores.has(matchId)) {
    // Initialize new match score
    mockScores.set(matchId, {
      home_score: Math.floor(Math.random() * 200),
      away_score: Math.floor(Math.random() * 200),
      home_wickets: Math.floor(Math.random() * 8),
      away_wickets: Math.floor(Math.random() * 8),
      home_overs: (Math.random() * 20).toFixed(1),
      away_overs: (Math.random() * 20).toFixed(1),
      last_updated: Date.now(),
    });
  } else {
    // Update existing match score
    const currentScore = mockScores.get(matchId);
    const timeDiff = Date.now() - currentScore.last_updated;

    // Only update every 30 seconds
    if (timeDiff >= 30000) {
      mockScores.set(matchId, {
        home_score: currentScore.home_score + Math.floor(Math.random() * 6),
        away_score: currentScore.away_score + Math.floor(Math.random() * 6),
        home_wickets: Math.min(
          currentScore.home_wickets + (Math.random() > 0.9 ? 1 : 0),
          10
        ),
        away_wickets: Math.min(
          currentScore.away_wickets + (Math.random() > 0.9 ? 1 : 0),
          10
        ),
        home_overs: Math.min(
          (parseFloat(currentScore.home_overs) + 0.1).toFixed(1),
          20.0
        ),
        away_overs: Math.min(
          (parseFloat(currentScore.away_overs) + 0.1).toFixed(1),
          20.0
        ),
        last_updated: Date.now(),
      });
    }
  }
  return mockScores.get(matchId);
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use(limiter);

// CORS Configuration
const corsOptions = {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Apply CORS with options
app.use(cors(corsOptions));

// Middleware
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "batball", // Specify the database name
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  })
  .then(() => {
    console.log("Connected to MongoDB - Database: batball");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1); // Exit if unable to connect to database
  });

// Handle MongoDB connection errors
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  process.exit(0);
});

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error("Error details:", {
    message: err.message,
    stack: err.stack,
    status: err.status,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      status: err.status || 500,
      path: req.path,
    },
  });
};

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Username or email already exists" });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.status(201).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Post Routes
app.post("/api/posts", auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const post = new Post({
      title,
      content,
      author: req.user._id,
    });
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", "username")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "username")
      .populate("comments.user", "username");

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Transform comments to handle both user and guest comments
    const transformedPost = post.toObject();
    transformedPost.comments = transformedPost.comments.map((comment) => ({
      ...comment,
      username: comment.user ? comment.user.username : comment.guestUsername,
    }));

    res.json(transformedPost);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Comment Routes
app.post("/api/posts/:postId/comments", async (req, res) => {
  try {
    const { text, guestUsername } = req.body;
    const { postId } = req.params;
    const authHeader = req.header("Authorization");

    let commentData = { text };

    // If user is authenticated, use their ID
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (user) {
          commentData.user = user._id;
        }
      } catch (error) {
        // Token verification failed, treat as guest
        ("Invalid token, treating as guest comment");
      }
    }

    // If no user ID, use guest username
    if (!commentData.user) {
      if (!guestUsername) {
        return res.status(400).json({ error: "Guest username is required" });
      }
      commentData.guestUsername = guestUsername;
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    post.comments.push(commentData);
    await post.save();

    // Populate the newly added comment
    const populatedPost = await Post.findById(postId)
      .populate("comments.user", "username")
      .populate("author", "username");

    const newComment =
      populatedPost.comments[populatedPost.comments.length - 1];

    res.status(201).json(newComment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Data transformation functions
const transformMatchData = (data) => {
  if (!data || !data.data) {
    throw new Error("Invalid API response: Expected data object");
  }

  // Transform matches without filtering
  const transformedMatches = data.data.map((match) => ({
    name: match.name,
    teams: {
      team1: {
        name: match.teams?.[0] || "TBA",
        score: match.score?.[0] || "-",
      },
      team2: {
        name: match.teams?.[1] || "TBA",
        score: match.score?.[1] || "-",
      },
    },
    result: match.status || "Upcoming",
    date: match.date,
    matchType: match.matchType,
  }));

  return transformedMatches;
};

// News API Proxy Route
app.get(
  "/api/news",
  asyncHandler(async (req, res) => {
    const {
      q = "cricket",
      language = "en",
      sortBy = "publishedAt",
      pageSize = 10,
      page = 1,
    } = req.query;

    const NEWS_API_KEY =
      process.env.NEWS_API_KEY || "fe291aa42513443ca0030f33ae26a45e";

    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${q}&language=${language}&sortBy=${sortBy}&pageSize=${pageSize}&page=${page}&apiKey=${NEWS_API_KEY}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = new Error(
        `News API responded with status: ${response.status}`
      );
      error.status = response.status;
      throw error;
    }

    const data = await response.json();

    if (data.status === "error") {
      const error = new Error(data.message || "News API returned an error");
      error.status = 400;
      throw error;
    }

    res.json(data);
  })
);

// Helper function to make API requests to Cricket Data API
const fetchFromCricketData = async (endpoint, params = {}) => {
  try {
    const queryParams = new URLSearchParams({
      ...params,
      apikey: API_KEY,
    }).toString();

    const url = `${CRICKET_DATA_BASE_URL}${endpoint}?${queryParams}`;
    console.log("Fetching from URL:", url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `Cricket Data API error (${response.status}): ${errorBody}`
      );
      throw new Error(
        `Cricket Data API error (${response.status}): ${errorBody}`
      );
    }

    return response;
  } catch (error) {
    console.error("Error in fetchFromCricketData:", error.message);
    if (error.name === "AbortError") {
      throw new Error("Request timeout - the server took too long to respond");
    }
    throw error;
  }
};

// Mock data for when the API fails
const getMockMatchData = (type) => {
  if (type === "live") {
    return {
      status: "success",
      data: [
        {
          id: "mock-live-1",
          name: "India vs Australia",
          status: "India won the toss and elected to bat",
          venue: "Melbourne Cricket Ground",
          date: "2023-05-15",
          dateTimeGMT: new Date().toISOString(),
          teams: ["India", "Australia"],
          score: [
            { inning: "India", r: 245, w: 6, o: "50.0" },
            { inning: "Australia", r: 180, w: 4, o: "35.2" },
          ],
          matchType: "ODI",
          tossWinner: "India",
          tossChoice: "bat",
          matchWinner: "",
        },
        {
          id: "mock-live-2",
          name: "England vs New Zealand",
          status: "England won the toss and elected to bowl",
          venue: "Lord's Cricket Ground",
          date: "2023-05-15",
          dateTimeGMT: new Date().toISOString(),
          teams: ["England", "New Zealand"],
          score: [
            { inning: "New Zealand", r: 210, w: 8, o: "50.0" },
            { inning: "England", r: 150, w: 3, o: "30.0" },
          ],
          matchType: "ODI",
          tossWinner: "England",
          tossChoice: "bowl",
          matchWinner: "",
        },
      ],
    };
  } else if (type === "upcoming") {
    return {
      status: "success",
      data: [
        {
          id: "mock-upcoming-1",
          name: "South Africa vs Pakistan",
          status: "Match starts in 2 days",
          venue: "Johannesburg",
          date: "2023-05-18",
          dateTimeGMT: new Date(
            Date.now() + 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
          teams: ["South Africa", "Pakistan"],
          matchType: "T20",
        },
        {
          id: "mock-upcoming-2",
          name: "West Indies vs Sri Lanka",
          status: "Match starts in 3 days",
          venue: "Barbados",
          date: "2023-05-19",
          dateTimeGMT: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000
          ).toISOString(),
          teams: ["West Indies", "Sri Lanka"],
          matchType: "Test",
        },
        {
          id: "mock-upcoming-3",
          name: "Bangladesh vs Zimbabwe",
          status: "Match starts in 5 days",
          venue: "Dhaka",
          date: "2023-05-21",
          dateTimeGMT: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000
          ).toISOString(),
          teams: ["Bangladesh", "Zimbabwe"],
          matchType: "ODI",
        },
      ],
    };
  }
  return { status: "success", data: [] };
};

// Cricket Data API Routes
app.get(
  "/api/matches/live",
  asyncHandler(async (req, res) => {
    try {
      const cacheKey = "live_matches";
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      try {
        const response = await fetchFromCricketData("/matches");
        const data = await response.json();

        // Transform data to match our frontend expectations
        const transformedData = {
          status: "success",
          data: data.data
            .filter((match) => match.matchStarted && !match.matchEnded)
            .map((match) => ({
              id: match.id,
              name: match.name,
              status: match.status,
              venue: match.venue,
              date: match.date,
              dateTimeGMT: match.dateTimeGMT,
              teams: match.teams,
              score: match.score || [],
              matchType: match.matchType,
              tossWinner: match.tossWinner,
              tossChoice: match.tossChoice,
              matchWinner: match.matchWinner,
            })),
        };

        cache.set(cacheKey, transformedData, 30); // Cache for 30 seconds
        return res.json(transformedData);
      } catch (apiError) {
        console.error(
          "Error fetching from Cricket API, using mock data:",
          apiError.message
        );
        // Use mock data if API fails
        const mockData = getMockMatchData("live");
        cache.set(cacheKey, mockData, 30); // Cache for 30 seconds
        return res.json(mockData);
      }
    } catch (error) {
      console.error("Error in /api/matches/live route:", error);
      res.status(500).json({
        error: {
          message: "Failed to fetch live matches",
          details: error.message,
        },
      });
    }
  })
);

app.get(
  "/api/matches/upcoming",
  asyncHandler(async (req, res) => {
    try {
      const cacheKey = "upcoming_matches";
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      try {
        const response = await fetchFromCricketData("/matches");
        const data = await response.json();

        // Filter upcoming matches and transform data
        const transformedData = {
          status: "success",
          data: data.data
            .filter((match) => !match.matchStarted)
            .map((match) => ({
              id: match.id,
              name: match.name,
              status: match.status,
              venue: match.venue,
              date: match.date,
              dateTimeGMT: match.dateTimeGMT,
              teams: match.teams,
              matchType: match.matchType,
            })),
        };

        cache.set(cacheKey, transformedData);
        return res.json(transformedData);
      } catch (apiError) {
        console.error(
          "Error fetching from Cricket API, using mock data:",
          apiError.message
        );
        // Use mock data if API fails
        const mockData = getMockMatchData("upcoming");
        cache.set(cacheKey, mockData, 30); // Cache for 30 seconds
        return res.json(mockData);
      }
    } catch (error) {
      console.error("Error in /api/matches/upcoming route:", error);
      res.status(500).json({
        error: {
          message: "Failed to fetch upcoming matches",
          details: error.message,
        },
      });
    }
  })
);

app.get(
  "/api/matches/current",
  asyncHandler(async (req, res) => {
    try {
      const cacheKey = "current_matches";
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      const response = await fetchFromCricketData("/currentmatches");
      const data = await response.json();
      const transformedData = transformMatchData(data);

      cache.set(cacheKey, transformedData);
      res.json(transformedData);
    } catch (error) {
      console.error("Error fetching current matches:", error);
      res.status(500).json({
        error: {
          message: "Failed to fetch current matches",
          details: error.message,
        },
      });
    }
  })
);

app.get(
  "/api/matches/:matchId",
  asyncHandler(async (req, res) => {
    try {
      const { matchId } = req.params;
      const cacheKey = `match_${matchId}`;
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      const response = await fetchFromCricketData("/match_info", {
        id: matchId,
      });
      const data = await response.json();

      // Transform match data
      const transformedData = {
        status: data.status,
        data: {
          id: data.data.id,
          name: data.data.name,
          status: data.data.status,
          venue: data.data.venue,
          date: data.data.date,
          dateTimeGMT: data.data.dateTimeGMT,
          teams: data.data.teams,
          score: data.data.score || [],
          matchType: data.data.matchType,
          tossWinner: data.data.tossWinner,
          tossChoice: data.data.tossChoice,
          matchWinner: data.data.matchWinner,
        },
      };

      cache.set(cacheKey, transformedData);
      res.json(transformedData);
    } catch (error) {
      console.error(`Error fetching match ${req.params.matchId}:`, error);
      res.status(500).json({
        error: {
          message: "Failed to fetch match details",
          details: error.message,
        },
      });
    }
  })
);

app.get(
  "/api/series",
  asyncHandler(async (req, res) => {
    try {
      const cacheKey = "all_series";
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      const response = await fetchFromCricketData("/series");
      const data = await response.json();
      const transformedData = transformSeriesData(data);

      cache.set(cacheKey, transformedData);
      res.json(transformedData);
    } catch (error) {
      console.error("Error fetching series:", error);
      res.status(500).json({
        error: {
          message: "Failed to fetch series",
          details: error.message,
        },
      });
    }
  })
);

app.get(
  "/api/series/:seriesId",
  asyncHandler(async (req, res) => {
    try {
      const { seriesId } = req.params;
      const cacheKey = `series_${seriesId}`;
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      const response = await fetchFromCricketData(`/series/${seriesId}`);
      const data = await response.json();

      cache.set(cacheKey, data);
      res.json(data);
    } catch (error) {
      console.error(`Error fetching series ${req.params.seriesId}:`, error);
      res.status(500).json({
        error: {
          message: "Failed to fetch series details",
          details: error.message,
        },
      });
    }
  })
);

app.get(
  "/api/players/:playerId",
  asyncHandler(async (req, res) => {
    try {
      const { playerId } = req.params;
      const cacheKey = `player_${playerId}`;
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      const response = await fetchFromCricketData(`/players/${playerId}`);
      const data = await response.json();

      cache.set(cacheKey, data);
      res.json(data);
    } catch (error) {
      console.error(`Error fetching player ${req.params.playerId}:`, error);
      res.status(500).json({
        error: {
          message: "Failed to fetch player details",
          details: error.message,
        },
      });
    }
  })
);

app.get(
  "/api/stats/rankings/:type",
  asyncHandler(async (req, res) => {
    try {
      const { type } = req.params; // type can be "batsmen", "bowlers", "teams"
      const cacheKey = `rankings_${type}`;
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      const response = await fetchFromCricketData(`/stats/rankings/${type}`);
      const data = await response.json();

      cache.set(cacheKey, data);
      res.json(data);
    } catch (error) {
      console.error(`Error fetching rankings for ${req.params.type}:`, error);
      res.status(500).json({
        error: {
          message: "Failed to fetch rankings",
          details: error.message,
        },
      });
    }
  })
);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    cache: {
      stats: cache.getStats(),
      keys: cache.keys(),
    },
  });
});

// Apply error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
