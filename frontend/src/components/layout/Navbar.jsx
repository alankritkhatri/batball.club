import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthModal from "../Auth/AuthModal";
import Logo from "../common/Logo";
import "./Navbar.css";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // To track whether to show login or register form

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
  };

  const openLoginModal = () => {
    setAuthMode("login");
    setShowAuthModal(true);
  };

  const openRegisterModal = () => {
    setAuthMode("register");
    setShowAuthModal(true);
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Logo size="medium" />
      </div>

      <div className="hamburger-menu" onClick={toggleMobileMenu}>
        <div
          className={`hamburger-line ${mobileMenuOpen ? "active" : ""}`}
        ></div>
        <div
          className={`hamburger-line ${mobileMenuOpen ? "active" : ""}`}
        ></div>
        <div
          className={`hamburger-line ${mobileMenuOpen ? "active" : ""}`}
        ></div>
      </div>

      <div className={`nav-center ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="main-nav-items">
          <Link
            to="/forum"
            className="nav-item blue-bg"
            onClick={closeMobileMenu}
          >
            Forums
          </Link>

          <Link
            to="/champions-chat"
            className="nav-item live-chat highlight-bg"
            onClick={closeMobileMenu}
          >
            <span className="live-chat"> Champions Trophy Chat</span>
            <span className="live-indicator">LIVE</span>
          </Link>
        </div>

        <div className="secondary-nav-items">
          <div className="nav-item disabled">
            Matches
            <span className="soon-chip">SOON</span>
          </div>
          <div className="nav-item disabled">
            Events
            <span className="soon-chip">SOON</span>
          </div>
          <div className="nav-item disabled">
            Rankings
            <span className="soon-chip">SOON</span>
          </div>
          <div className="nav-item disabled">
            Stats
            <span className="soon-chip">SOON</span>
          </div>
        </div>
      </div>

      <div className={`nav-right ${mobileMenuOpen ? "mobile-open" : ""}`}>
        {isAuthenticated ? (
          <div className="user-controls">
            <span className="username">{user.username}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <div className="auth-buttons">
            <button className="auth-btn login-btn" onClick={openLoginModal}>
              Login
            </button>
            <button
              className="auth-btn register-btn"
              onClick={openRegisterModal}
            >
              Register
            </button>
          </div>
        )}
      </div>
      {showAuthModal && !isAuthenticated && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
      )}
    </nav>
  );
};

export default Navbar;
