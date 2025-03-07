import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
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
    // Don't automatically reload on 401 errors - let components handle them
    // This allows the login modal to stay open with error messages
    if (
      error.response?.status === 401 &&
      !error.config.url.includes("/api/auth/login")
    ) {
      // Only clear auth data and reload for non-login 401 errors
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

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
