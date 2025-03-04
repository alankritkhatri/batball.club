import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthModal from "../Auth/AuthModal";
import Logo from "../common/Logo";
import "./Navbar.css";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Logo size="medium" />
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search matches, teams, or players..."
          />
        </div>
      </div>

      <div className="nav-center">
        <Link to="/forum" className="nav-item">
          Forums
        </Link>
        <Link to="/matches" className="nav-item">
          Matches
        </Link>
        <Link to="/events" className="nav-item">
          Events
        </Link>
        <Link to="/rankings" className="nav-item">
          Rankings
        </Link>
        <Link to="/stats" className="nav-item">
          Stats
        </Link>
      </div>

      <div className="nav-right">
        <div className="toggle-group">
          <span className="toggle-label">Night:</span>
          <button className="toggle-btn active">ON</button>
        </div>
        <div className="toggle-group">
          <span className="toggle-label">Spoilers:</span>
          <button className="toggle-btn active">ON</button>
        </div>
        {isAuthenticated ? (
          <div className="user-controls">
            <span className="username">{user.username}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <button className="login-btn" onClick={() => setShowAuthModal(true)}>
            Log in / Register
          </button>
        )}
      </div>
      {showAuthModal && !isAuthenticated && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;
