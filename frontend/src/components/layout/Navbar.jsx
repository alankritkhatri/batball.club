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
  const [authMode, setAuthMode] = useState("login");

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

        <div className={`nav-center ${mobileMenuOpen ? "mobile-open" : ""}`}>
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
