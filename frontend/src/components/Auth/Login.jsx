import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../services/api";
import "./Auth.css";

const Login = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login: authLogin } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Log the login attempt for debugging
      console.log("Attempting login with:", formData.email);

      const response = await auth.login(formData.email, formData.password);

      // Log the response for debugging
      console.log("Login response:", response);

      const { token, user } = response;

      if (!token) {
        console.error("No token received from server");
        throw new Error("No authentication token received from server");
      }

      if (!user) {
        console.error("No user data received from server");
        throw new Error("No user data received from server");
      }

      // Store token in localStorage
      localStorage.setItem("token", token);

      // Log token storage for debugging
      console.log("Token stored in localStorage:", token);

      // Create a complete user object with token
      const userWithToken = {
        ...user,
        token: token,
      };

      // Pass the complete user object to authLogin
      authLogin(userWithToken);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(
        error.response?.data?.error ||
          error.message ||
          "An error occurred during login"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Login</h2>
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isLoading}
            className={error ? "error" : ""}
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="auth-button" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
