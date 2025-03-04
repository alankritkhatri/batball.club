import React from "react";
import { Link } from "react-router-dom";
import "./Logo.css";

const Logo = ({ size = "medium" }) => {
  return (
    <Link to="/" className={`logo logo-${size}`}>
      <img src="/battball logo.png" alt="BatBall Club" className="logo-image" />
      <span className="logo-text">BatBall Club</span>
    </Link>
  );
};

export default Logo;
