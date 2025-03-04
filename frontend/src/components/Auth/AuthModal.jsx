import React, { useState, useEffect, useCallback } from "react";
import Login from "./Login";
import Register from "./Register";
import "./Auth.css";

const AuthModal = ({ onClose, onSuccess, message }) => {
  const [isLogin, setIsLogin] = useState(true);

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    // Add event listener for escape key
    document.addEventListener("keydown", handleKeyDown);
    // Prevent scrolling of background content
    document.body.style.overflow = "hidden";

    return () => {
      // Cleanup
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [handleKeyDown]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="auth-modal"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="modal-content">
        <button
          className="close-btn"
          onClick={onClose}
          aria-label="Close authentication modal"
        >
          ×
        </button>
        {message && <div className="auth-message">{message}</div>}
        <div className="auth-toggle" role="tablist">
          <button
            className={`toggle-btn ${isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(true)}
            role="tab"
            aria-selected={isLogin}
            aria-controls="login-panel"
            id="login-tab"
          >
            Login
          </button>
          <button
            className={`toggle-btn ${!isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(false)}
            role="tab"
            aria-selected={!isLogin}
            aria-controls="register-panel"
            id="register-tab"
          >
            Register
          </button>
        </div>
        <div
          role="tabpanel"
          id={isLogin ? "login-panel" : "register-panel"}
          aria-labelledby={isLogin ? "login-tab" : "register-tab"}
        >
          {isLogin ? (
            <Login onSuccess={handleSuccess} />
          ) : (
            <Register onSuccess={handleSuccess} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
