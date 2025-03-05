const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const NodeCache = require("node-cache");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const auth = require("./middleware/auth");
const User = require("./models/User");
const Post = require("./models/Post");
const ChatMessage = require("./models/ChatMessage");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const asyncHandler = require("express-async-handler");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://batball.club",
      "https://www.batball.club",
      "http://batball.club",
      "http://www.batball.club",
      "www.batball.club",
    ],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  transports: ["websocket", "polling"],
  path: "/socket.io/",
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e8, // 100 MB
  serveClient: false,
});

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.CRICBUZZ_API_KEY;
const API_HOST = process.env.CRICBUZZ_API_HOST;
const CRICBUZZ_BASE_URL = "https://cricbuzz-cricket.p.rapidapi.com";
const CACHE_TTL = 30; // Cache for 30 seconds to keep live data fresh
const MATCH_CACHE_DURATION = 30; // Cache matches for 30 seconds

// Configure trust proxy with specific settings instead of a boolean
// This helps prevent IP spoofing while still working behind a reverse proxy
app.set("trust proxy", "loopback, linklocal, uniquelocal");

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

// CORS Configuration
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://batball.club",
    "https://www.batball.club",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
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
    // Start the server after successful MongoDB connection
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
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

// Helper function to make API requests to Cricbuzz API
const fetchFromCricbuzz = async (endpoint, params = {}) => {
  try {
    let url = `${CRICBUZZ_BASE_URL}${endpoint}`;

    // Add query parameters if any
    if (Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams(params).toString();
      url = `${url}?${queryParams}`;
    }

    console.log("Fetching from URL:", url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": API_HOST,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Cricbuzz API error (${response.status}): ${errorBody}`);
    }

    return response;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Request timeout - the server took too long to respond");
    }
    throw error;
  }
};

// Cricket Data API Routes
app.get(
  "/api/matches/live",
  asyncHandler(async (req, res) => {
    try {
      const cacheKey = "live_matches";

      // Check for timestamp query parameter to force refresh
      const forceRefresh = req.query._t ? true : false;

      // Get cached data if not forcing refresh
      const cachedData = forceRefresh ? null : cache.get(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      // First, get all matches
      const response = await fetchFromCricbuzz("/matches/v1/live");
      const data = await response.json();

      // Filter for ICC tournaments only
      const iccMatches = data.typeMatches.flatMap((typeMatch) =>
        typeMatch.seriesMatches
          .filter(
            (seriesMatch) =>
              // Check if it's an ICC tournament (contains "ICC", "World Cup", "Champions Trophy", "T20 World Cup", etc.)
              seriesMatch.seriesAdWrapper &&
              (seriesMatch.seriesAdWrapper.seriesName.includes("ICC") ||
                seriesMatch.seriesAdWrapper.seriesName.includes("World Cup") ||
                seriesMatch.seriesAdWrapper.seriesName.includes(
                  "Champions Trophy"
                ) ||
                seriesMatch.seriesAdWrapper.seriesName.includes("T20 World"))
          )
          .flatMap((seriesMatch) =>
            seriesMatch.seriesAdWrapper.matches.map((match) => ({
              id: match.matchInfo.matchId,
              name: `${match.matchInfo.team1.teamName} vs ${match.matchInfo.team2.teamName}`,
              seriesName: seriesMatch.seriesAdWrapper.seriesName,
              status: match.matchInfo.status,
              venue: match.matchInfo.venueInfo
                ? match.matchInfo.venueInfo.ground
                : "Unknown",
              date: match.matchInfo.startDate,
              dateTimeGMT: new Date(
                parseInt(match.matchInfo.startDate)
              ).toISOString(),
              teams: [
                match.matchInfo.team1.teamName,
                match.matchInfo.team2.teamName,
              ],
              score: [
                {
                  team: match.matchInfo.team1.teamName,
                  inning:
                    match.matchScore && match.matchScore.team1Score
                      ? `${match.matchScore.team1Score.inngs1.runs}/${match.matchScore.team1Score.inngs1.wickets}`
                      : "Yet to bat",
                },
                {
                  team: match.matchInfo.team2.teamName,
                  inning:
                    match.matchScore && match.matchScore.team2Score
                      ? `${match.matchScore.team2Score.inngs1.runs}/${match.matchScore.team2Score.inngs1.wickets}`
                      : "Yet to bat",
                },
              ],
              matchType: match.matchInfo.matchFormat,
              tossWinner: match.matchInfo.tossResults
                ? match.matchInfo.tossResults.tossWinnerName
                : null,
              tossChoice: match.matchInfo.tossResults
                ? match.matchInfo.tossResults.decision
                : null,
              matchWinner:
                match.matchInfo.state === "Complete"
                  ? match.matchInfo.status.includes(
                      match.matchInfo.team1.teamName
                    )
                    ? match.matchInfo.team1.teamName
                    : match.matchInfo.status.includes(
                        match.matchInfo.team2.teamName
                      )
                    ? match.matchInfo.team2.teamName
                    : null
                  : null,
            }))
          )
      );

      // Transform data to match our frontend expectations
      const transformedData = {
        status: "success",
        data: iccMatches,
      };

      cache.set(cacheKey, transformedData, MATCH_CACHE_DURATION); // Cache for 30 seconds
      res.json(transformedData);
    } catch (error) {
      console.error("Error fetching live matches:", error);
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

      // Check for timestamp query parameter to force refresh
      const forceRefresh = req.query._t ? true : false;

      // Get cached data if not forcing refresh
      const cachedData = forceRefresh ? null : cache.get(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      // First, get all matches
      const response = await fetchFromCricbuzz("/matches/v1/upcoming");
      const data = await response.json();

      // Filter for ICC tournaments only
      const iccMatches = data.typeMatches.flatMap((typeMatch) =>
        typeMatch.seriesMatches
          .filter(
            (seriesMatch) =>
              // Check if it's an ICC tournament (contains "ICC", "World Cup", "Champions Trophy", "T20 World Cup", etc.)
              seriesMatch.seriesAdWrapper &&
              (seriesMatch.seriesAdWrapper.seriesName.includes("ICC") ||
                seriesMatch.seriesAdWrapper.seriesName.includes("World Cup") ||
                seriesMatch.seriesAdWrapper.seriesName.includes(
                  "Champions Trophy"
                ) ||
                seriesMatch.seriesAdWrapper.seriesName.includes("T20 World"))
          )
          .flatMap((seriesMatch) =>
            seriesMatch.seriesAdWrapper.matches.map((match) => ({
              id: match.matchInfo.matchId,
              name: `${match.matchInfo.team1.teamName} vs ${match.matchInfo.team2.teamName}`,
              seriesName: seriesMatch.seriesAdWrapper.seriesName,
              status: match.matchInfo.status,
              venue: match.matchInfo.venueInfo
                ? match.matchInfo.venueInfo.ground
                : "Unknown",
              date: match.matchInfo.startDate,
              dateTimeGMT: new Date(
                parseInt(match.matchInfo.startDate)
              ).toISOString(),
              teams: [
                match.matchInfo.team1.teamName,
                match.matchInfo.team2.teamName,
              ],
              score: [],
              matchType: match.matchInfo.matchFormat,
              tossWinner: null,
              tossChoice: null,
              matchWinner: null,
            }))
          )
      );

      // Transform data to match our frontend expectations
      const transformedData = {
        status: "success",
        data: iccMatches,
      };

      cache.set(cacheKey, transformedData, MATCH_CACHE_DURATION); // Cache for 30 seconds
      res.json(transformedData);
    } catch (error) {
      console.error("Error fetching upcoming matches:", error);
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

      // Check for cache-control header to force refresh
      const forceRefresh = req.headers["cache-control"] === "no-cache";

      // Get cached data if not forcing refresh
      const cachedData = forceRefresh ? null : cache.get(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      // First, get all matches
      const response = await fetchFromCricbuzz("/matches/v1/live");
      const data = await response.json();

      // Filter for ICC tournaments only
      const iccMatches = data.typeMatches.flatMap((typeMatch) =>
        typeMatch.seriesMatches
          .filter(
            (seriesMatch) =>
              // Check if it's an ICC tournament (contains "ICC", "World Cup", "Champions Trophy", "T20 World Cup", etc.)
              seriesMatch.seriesAdWrapper &&
              (seriesMatch.seriesAdWrapper.seriesName.includes("ICC") ||
                seriesMatch.seriesAdWrapper.seriesName.includes("World Cup") ||
                seriesMatch.seriesAdWrapper.seriesName.includes(
                  "Champions Trophy"
                ) ||
                seriesMatch.seriesAdWrapper.seriesName.includes("T20 World"))
          )
          .flatMap((seriesMatch) =>
            seriesMatch.seriesAdWrapper.matches.map((match) => ({
              id: match.matchInfo.matchId,
              name: `${match.matchInfo.team1.teamName} vs ${match.matchInfo.team2.teamName}`,
              seriesName: seriesMatch.seriesAdWrapper.seriesName,
              status: match.matchInfo.status,
              venue: match.matchInfo.venueInfo
                ? match.matchInfo.venueInfo.ground
                : "Unknown",
              date: match.matchInfo.startDate,
              dateTimeGMT: new Date(
                parseInt(match.matchInfo.startDate)
              ).toISOString(),
              teams: [
                match.matchInfo.team1.teamName,
                match.matchInfo.team2.teamName,
              ],
              score: [
                {
                  team: match.matchInfo.team1.teamName,
                  inning:
                    match.matchScore && match.matchScore.team1Score
                      ? `${match.matchScore.team1Score.inngs1.runs}/${match.matchScore.team1Score.inngs1.wickets}`
                      : "Yet to bat",
                },
                {
                  team: match.matchInfo.team2.teamName,
                  inning:
                    match.matchScore && match.matchScore.team2Score
                      ? `${match.matchScore.team2Score.inngs1.runs}/${match.matchScore.team2Score.inngs1.wickets}`
                      : "Yet to bat",
                },
              ],
              matchType: match.matchInfo.matchFormat,
              tossWinner: match.matchInfo.tossResults
                ? match.matchInfo.tossResults.tossWinnerName
                : null,
              tossChoice: match.matchInfo.tossResults
                ? match.matchInfo.tossResults.decision
                : null,
              matchWinner:
                match.matchInfo.state === "Complete"
                  ? match.matchInfo.status.includes(
                      match.matchInfo.team1.teamName
                    )
                    ? match.matchInfo.team1.teamName
                    : match.matchInfo.status.includes(
                        match.matchInfo.team2.teamName
                      )
                    ? match.matchInfo.team2.teamName
                    : null
                  : null,
            }))
          )
      );

      // Transform data to match our frontend expectations
      const transformedData = {
        status: "success",
        data: iccMatches,
      };

      cache.set(cacheKey, transformedData, MATCH_CACHE_DURATION); // Cache for 30 seconds
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

      // Check for timestamp query parameter to force refresh
      const forceRefresh = req.query._t ? true : false;

      // Get cached data if not forcing refresh
      const cachedData = forceRefresh ? null : cache.get(cacheKey);

      if (cachedData) {
        return res.json(cachedData);
      }

      // Get match info
      const response = await fetchFromCricbuzz(`/mcenter/v1/${matchId}`);
      const data = await response.json();

      // Transform match data
      const transformedData = {
        status: "success",
        data: {
          id: matchId,
          name: `${data.matchInfo.team1.teamName} vs ${data.matchInfo.team2.teamName}`,
          seriesName: data.matchInfo.seriesAdWrapper?.seriesName || "Unknown",
          status: data.matchInfo.status,
          venue: data.matchInfo.venueInfo
            ? data.matchInfo.venueInfo.ground
            : "Unknown",
          date: data.matchInfo.startDate,
          dateTimeGMT: new Date(
            parseInt(data.matchInfo.startDate)
          ).toISOString(),
          teams: [data.matchInfo.team1.teamName, data.matchInfo.team2.teamName],
          score: [
            {
              team: data.matchInfo.team1.teamName,
              inning:
                data.matchScore && data.matchScore.team1Score
                  ? `${data.matchScore.team1Score.inngs1.runs}/${data.matchScore.team1Score.inngs1.wickets}`
                  : "Yet to bat",
            },
            {
              team: data.matchInfo.team2.teamName,
              inning:
                data.matchScore && data.matchScore.team2Score
                  ? `${data.matchScore.team2Score.inngs1.runs}/${data.matchScore.team2Score.inngs1.wickets}`
                  : "Yet to bat",
            },
          ],
          matchType: data.matchInfo.matchFormat,
          tossWinner: data.matchInfo.tossResults
            ? data.matchInfo.tossResults.tossWinnerName
            : null,
          tossChoice: data.matchInfo.tossResults
            ? data.matchInfo.tossResults.decision
            : null,
          matchWinner:
            data.matchInfo.state === "Complete"
              ? data.matchInfo.status.includes(data.matchInfo.team1.teamName)
                ? data.matchInfo.team1.teamName
                : data.matchInfo.status.includes(data.matchInfo.team2.teamName)
                ? data.matchInfo.team2.teamName
                : null
              : null,
        },
      };

      cache.set(cacheKey, transformedData, MATCH_CACHE_DURATION); // Cache for 30 seconds
      res.json(transformedData);
    } catch (error) {
      console.error("Error fetching match details:", error);
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

      const response = await fetchFromCricbuzz("/series");
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

      const response = await fetchFromCricbuzz(`/series/${seriesId}`);
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

      const response = await fetchFromCricbuzz(`/players/${playerId}`);
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

      const response = await fetchFromCricbuzz(`/stats/rankings/${type}`);
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

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Handle joining a chat room
  socket.on("join_room", async (data) => {
    try {
      const { userId, username, room, isGuest } = data;
      console.log(
        `User ${username} (${userId || "unknown ID"}) joining room: ${room}${
          isGuest ? " as guest" : ""
        }`
      );

      // Validate user data
      if (!userId) {
        console.warn(`User ${username} attempted to join without userId`);
      }

      // Join the specified room
      socket.join(room);

      // Create a join message - only for authenticated users to reduce spam
      // Skip join messages for guests to reduce UI clutter
      if (userId && !isGuest) {
        const joinMessage = new ChatMessage({
          user: userId,
          username: username || "Anonymous",
          message: `${username || "Anonymous"} has joined the chat`,
          eventType: "join",
          chatRoom: room,
        });

        try {
          await joinMessage.save();
          console.log("Join message saved to database:", joinMessage._id);
        } catch (saveError) {
          console.error("Error saving join message:", saveError);
        }

        // Broadcast the join message to all users in the room
        io.to(room).emit("receive_message", {
          _id: joinMessage._id,
          username: joinMessage.username,
          message: joinMessage.message,
          eventType: joinMessage.eventType,
          createdAt: joinMessage.createdAt,
        });
      }

      // Send the last 50 messages to the user who just joined
      try {
        const chatHistory = await ChatMessage.find({ chatRoom: room })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();

        console.log(
          `Sending ${chatHistory.length} messages from history to user ${username}`
        );
        socket.emit("chat_history", chatHistory.reverse());
      } catch (historyError) {
        console.error("Error fetching chat history:", historyError);
        socket.emit("error", { message: "Failed to load chat history" });
      }
    } catch (error) {
      console.error("Error in join_room:", error);
      socket.emit("error", { message: "Failed to join chat room" });
    }
  });

  // Handle sending a message
  socket.on("send_message", async (data) => {
    try {
      const { userId, username, message, room, isGuest } = data;
      console.log(
        `Message from ${username} (ID: ${userId || "unknown"}) in room ${room}${
          isGuest ? " as guest" : ""
        }: ${message}`
      );

      // Enhanced validation with specific error messages
      if (!userId && !isGuest) {
        console.error("Missing userId in message data:", data);
        return socket.emit("error", {
          message:
            "Invalid message data: userId is required for non-guest users",
        });
      }

      if (!message) {
        console.error("Missing message content in message data:", data);
        return socket.emit("error", {
          message: "Invalid message data: message content is required",
        });
      }

      if (!room) {
        console.error("Missing room in message data:", data);
        return socket.emit("error", {
          message: "Invalid message data: room is required",
        });
      }

      if (isGuest && !username) {
        console.error("Missing username for guest message:", data);
        return socket.emit("error", {
          message: "Invalid message data: username is required for guest users",
        });
      }

      // Create and save the message
      const newMessage = new ChatMessage({
        user: isGuest ? userId : userId, // Store the guest ID as provided
        username: username || "Anonymous",
        message,
        chatRoom: room,
        eventType: "message",
        isGuest: isGuest || false,
      });

      try {
        await newMessage.save();
        console.log(
          "Message saved to database:",
          newMessage._id,
          isGuest ? "(Guest message)" : ""
        );

        // Log more details for debugging guest messages
        if (isGuest) {
          console.log("Guest message details:", {
            id: newMessage._id,
            user: newMessage.user,
            username: newMessage.username,
            isGuest: newMessage.isGuest,
            timestamp: newMessage.createdAt,
          });
        }
      } catch (saveError) {
        console.error("Error saving message:", saveError, newMessage);
        return socket.emit("error", {
          message: "Failed to save message to database",
        });
      }

      // Broadcast the message to all users in the room
      io.to(room).emit("receive_message", {
        _id: newMessage._id,
        username: newMessage.username,
        message: newMessage.message,
        eventType: newMessage.eventType,
        createdAt: newMessage.createdAt,
      });
    } catch (error) {
      console.error("Error in send_message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// REST API endpoints for chat
app.get(
  "/api/chat/:room",
  auth,
  asyncHandler(async (req, res) => {
    const { room } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await ChatMessage.find({ chatRoom: room })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(messages.reverse());
  })
);
