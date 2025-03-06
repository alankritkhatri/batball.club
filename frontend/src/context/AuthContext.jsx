import React, { createContext, useState, useContext, useEffect } from "react";
import AuthModal from "../components/Auth/AuthModal";
import GuestNameModal from "../components/Auth/GuestNameModal";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMessage, setLoginModalMessage] = useState("");
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestCallback, setGuestCallback] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    const storedGuestName = localStorage.getItem("guestName");

    if (storedGuestName) {
      setGuestName(storedGuestName);
    }

    if (storedUser && token) {
      try {
        const userData = JSON.parse(storedUser);
        console.log("Initializing from localStorage:", { userData, token });

        // Normalize the user data to ensure _id exists
        const normalizedUserData = {
          ...userData,
          _id: userData._id || userData.id, // Use _id if it exists, otherwise use id
          token: token, // Ensure token is included in user data
        };

        if (!normalizedUserData._id) {
          console.error("Stored user data is missing ID, logging out");
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        } else {
          setUser(normalizedUserData);
          setIsAuthenticated(true);
          // Update localStorage with normalized data
          localStorage.setItem("user", JSON.stringify(normalizedUserData));
        }
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    } else {
      console.log("No stored user data or token found");
    }
    setIsLoading(false);
  }, []);

  const login = (userData) => {
    // Ensure userData has the required fields
    // The server sends 'id' but we need '_id' for consistency
    const normalizedUserData = {
      ...userData,
      _id: userData._id || userData.id, // Use _id if it exists, otherwise use id
    };

    if (!normalizedUserData._id) {
      console.error(
        "Login attempted with invalid user data (missing id):",
        userData
      );
      return;
    }

    // Ensure token is included in userData or use the one from userData.token
    const token = userData.token || "";

    if (!token) {
      console.error("No token provided during login");
    }

    console.log("Logging in user:", normalizedUserData, "with token:", token);

    // Store token separately
    localStorage.setItem("token", token);

    // Store user data without token to avoid duplication
    const userDataToStore = { ...normalizedUserData };
    localStorage.setItem("user", JSON.stringify(userDataToStore));

    setUser(normalizedUserData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    console.log("Logging out user");
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const openLoginModal = (message = "") => {
    setLoginModalMessage(message);
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginModalMessage("");
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
  };

  // New functions for guest functionality
  const openGuestModal = (callback = null) => {
    setGuestCallback(callback);
    setShowGuestModal(true);
  };

  const closeGuestModal = () => {
    setShowGuestModal(false);
    setGuestCallback(null);
  };

  const handleGuestSubmit = (name) => {
    setGuestName(name);
    localStorage.setItem("guestName", name);

    // If there's a callback function, call it with the guest name
    if (guestCallback && typeof guestCallback === "function") {
      guestCallback(name);
      setGuestCallback(null);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        isLoading,
        openLoginModal,
        closeLoginModal,
        guestName,
        openGuestModal,
        closeGuestModal,
      }}
    >
      {children}
      {showLoginModal && (
        <AuthModal
          onClose={closeLoginModal}
          onSuccess={handleLoginSuccess}
          message={loginModalMessage}
        />
      )}
      {showGuestModal && (
        <GuestNameModal
          onClose={closeGuestModal}
          onSubmit={handleGuestSubmit}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
