import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const CRICBUZZ_API_URL = "https://cricbuzz-cricket.p.rapidapi.com/matches/v1";

// Create axios instance for main API
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Create axios instance for Cricbuzz API
const cricbuzzApi = axios.create({
  baseURL: CRICBUZZ_API_URL,
  headers: {
    "X-RapidAPI-Key": import.meta.env.VITE_RAPIDAPI_KEY,
    "X-RapidAPI-Host": "cricbuzz-cricket.p.rapidapi.com",
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data on unauthorized
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Cricket matches API endpoints
export const cricket = {
  getMatches: async () => {
    try {
      const response = await cricbuzzApi.get("/list");
      const matches = response.data;

      // Filter for trophy tournaments and sort matches
      const trophyMatches = matches.filter((match) =>
        match.typeMatches.some((type) =>
          type.seriesMatches.some((series) => {
            const seriesName = series.seriesAdWrapper.seriesName.toLowerCase();
            return (
              seriesName.includes("trophy") ||
              seriesName.includes("cup") ||
              seriesName.includes("world cup") ||
              seriesName.includes("championship") ||
              seriesName.includes("icc")
            );
          })
        )
      );

      // Separate matches by status
      const liveMatches = [];
      const upcomingMatches = [];
      const completedMatches = [];

      trophyMatches.forEach((match) => {
        const status = match.matchInfo.status.toLowerCase();
        if (status.includes("live")) {
          liveMatches.push(match);
        } else if (
          status.includes("upcoming") ||
          status.includes("scheduled")
        ) {
          upcomingMatches.push(match);
        } else {
          completedMatches.push(match);
        }
      });

      return {
        live: liveMatches,
        upcoming: upcomingMatches,
        completed: completedMatches,
      };
    } catch (error) {
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Failed to fetch cricket matches"
      );
    }
  },

  getMatchDetails: async (matchId) => {
    try {
      const response = await cricbuzzApi.get(`/match/${matchId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error ||
          error.message ||
          "Failed to fetch match details"
      );
    }
  },
};

export const auth = {
  login: async (email, password) => {
    try {
      const response = await api.post("/api/auth/login", { email, password });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || error.message || "Login failed"
      );
    }
  },
  register: async (username, email, password) => {
    try {
      const response = await api.post("/api/auth/register", {
        username,
        email,
        password,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || error.message || "Registration failed"
      );
    }
  },
};

export const posts = {
  getAll: async () => {
    try {
      const response = await api.get("/api/posts");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || error.message || "Failed to fetch posts"
      );
    }
  },
  create: async (postData) => {
    try {
      const response = await api.post("/api/posts", postData);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || error.message || "Failed to create post"
      );
    }
  },
  delete: async (postId) => {
    try {
      const response = await api.delete(`/api/posts/${postId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || error.message || "Failed to delete post"
      );
    }
  },
};

export default api;
