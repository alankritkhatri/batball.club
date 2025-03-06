import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthModal from "../Auth/AuthModal";
import Logo from "../common/Logo";
import "./Navbar.css";

const Navbar = () => {
  const { isAuthenticated, user, logout, guestName } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const navCenterRef = useRef(null);

  useEffect(() => {
    // Update the CSS variable for nav-center height when mobile menu is opened
    if (mobileMenuOpen && navCenterRef.current) {
      const height = navCenterRef.current.offsetHeight;
      document.documentElement.style.setProperty(
        "--nav-center-height",
        `${height}px`
      );

      // Add class to body to prevent scrolling when menu is open
      document.body.classList.add("menu-open");
    } else {
      // Remove class when menu is closed
      document.body.classList.remove("menu-open");
    }

    // Clean up function
    return () => {
      document.body.classList.remove("menu-open");
    };
  }, [mobileMenuOpen]);

  // Close mobile menu when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileMenuOpen]);

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
      <div className="navbar-container">
        <div className="nav-left">
          <Logo size="medium" onClick={closeMobileMenu} />
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

        <div
          ref={navCenterRef}
          className={`nav-center ${mobileMenuOpen ? "mobile-open" : ""}`}
        >
          <div className="nav-items-container">
            <div className="main-nav-items">
              <Link
                to="/forum"
                className="nav-item primary-btn"
                onClick={closeMobileMenu}
              >
                Forums
              </Link>

              <Link
                to="/champions-chat"
                className="nav-item accent-btn"
                onClick={closeMobileMenu}
              >
                <span className="live-indicator"></span>
                Champions Trophy Chat
              </Link>
            </div>

            <div className="secondary-nav-items">
              <div className="nav-item coming-soon">
                Matches
                <span className="badge badge-warning">SOON</span>
              </div>
              <div className="nav-item coming-soon">
                Events
                <span className="badge badge-warning">SOON</span>
              </div>
              <div className="nav-item coming-soon">
                Rankings
                <span className="badge badge-warning">SOON</span>
              </div>
              <div className="nav-item coming-soon">
                Stats
                <span className="badge badge-warning">SOON</span>
              </div>
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
          ) : guestName ? (
            <div className="guest-controls">
              <div className="guest-info">
                <svg
                  className="guest-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span className="guest-name">{guestName}</span>
              </div>
              <button className="login-link-btn" onClick={openLoginModal}>
                Login
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
