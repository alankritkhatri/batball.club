import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./Auth.css";

const GuestNameModal = ({ onClose, onSubmit }) => {
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState("");
  const modalRef = useRef(null);

  // Get stored guest name from localStorage if available
  useEffect(() => {
    const storedGuestName = localStorage.getItem("guestName");
    if (storedGuestName) {
      setGuestName(storedGuestName);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!guestName.trim()) {
      setError("Please enter a name");
      return;
    }

    // Store in localStorage
    localStorage.setItem("guestName", guestName);

    // Call the onSubmit callback with the guest name
    onSubmit(guestName);
    onClose();
  };

  useEffect(() => {
    // Prevent scrolling of background content
    document.body.style.overflow = "hidden";

    // Focus trap inside modal
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements && focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    return () => {
      // Cleanup
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="auth-modal"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-modal-title"
    >
      <div className="modal-content" ref={modalRef}>
        <button
          className="close-btn"
          onClick={onClose}
          aria-label="Close guest name modal"
        >
          ×
        </button>
        <h2 id="guest-modal-title" className="auth-title">
          Continue as Guest
        </h2>
        <p className="auth-message">
          Please enter a name to use for your posts and comments.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="guestName">Your Name</label>
            <input
              type="text"
              id="guestName"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name"
              className="auth-input"
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="auth-button">
            Continue as Guest
          </button>
        </form>
      </div>
    </div>
  );

  // Use createPortal to render the modal at the end of the document body
  return createPortal(modalContent, document.body);
};

export default GuestNameModal;
