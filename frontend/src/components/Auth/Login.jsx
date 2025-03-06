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
      // Attempt login
      const response = await auth.login(formData.email, formData.password);

      // Validate response
      const { token, user } = response;

      if (!token || !user) {
        throw new Error("Invalid response from server");
      }

      // Store token in localStorage
      localStorage.setItem("token", token);

      // Create a complete user object with token
      const userWithToken = {
        ...user,
        token: token,
      };

      // Pass the complete user object to authLogin
      authLogin(userWithToken);

      // Only call onSuccess if login was successful
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Login error:", error);

      // Set appropriate error message
      if (
        error.message.includes("401") ||
        error.message.includes("credentials")
      ) {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(
          error.response?.data?.error ||
            error.message ||
            "An error occurred. Please try again."
        );
      }

      // Highlight the password field on error
      const passwordInput = document.getElementById("password");
      if (passwordInput) {
        passwordInput.focus();
      }

      // Do NOT call onSuccess - this keeps the modal open
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
            className={error ? "error" : ""}
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
