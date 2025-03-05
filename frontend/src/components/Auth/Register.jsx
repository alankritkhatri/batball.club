import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../services/api";
import "./Auth.css";

const Register = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { login: authLogin } = useAuth();

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters long";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username =
        "Username can only contain letters, numbers and underscores";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (
      !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(formData.email)
    ) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one uppercase letter";
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one lowercase letter";
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one number";
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear all errors before validation
    setErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { token, user } = await auth.register(
        formData.username,
        formData.email,
        formData.password
      );

      if (!token || !user) {
        throw new Error("Invalid response from server");
      }

      localStorage.setItem("token", token);
      authLogin(user);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Registration error:", error);

      // Handle structured error response
      if (error.response?.data?.details) {
        setErrors(error.response.data.details);
      } else {
        setErrors({
          general:
            error.response?.data?.error ||
            error.message ||
            "An error occurred during registration",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Register</h2>
        {errors.general && (
          <div className="error-message">{errors.general}</div>
        )}
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            disabled={isLoading}
            minLength={3}
            className={errors.username ? "error" : ""}
          />
          {errors.username && (
            <div className="field-error">{errors.username}</div>
          )}
        </div>
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
            className={errors.email ? "error" : ""}
          />
          {errors.email && <div className="field-error">{errors.email}</div>}
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
            minLength={6}
            className={errors.password ? "error" : ""}
            autoComplete="new-password"
          />
          {errors.password && (
            <div className="field-error">{errors.password}</div>
          )}
          <small className="password-requirements">
            Password must be at least 6 characters long and contain uppercase,
            lowercase, and numbers
          </small>
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            disabled={isLoading}
            minLength={6}
            className={errors.confirmPassword ? "error" : ""}
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <div className="field-error">{errors.confirmPassword}</div>
          )}
        </div>
        <button type="submit" className="auth-button" disabled={isLoading}>
          {isLoading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
};

export default Register;
