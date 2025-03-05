import React from "react";
import { Link } from "react-router-dom";
import CricketLogo from "./CricketLogo";
import "./Logo.css";

const Logo = ({ size = "medium", onClick }) => {
  return (
    <Link to="/" className={`logo logo-${size}`} onClick={onClick}>
      <CricketLogo size={size} />
      <span className="logo-text">BatBall Club</span>
    </Link>
  );
};

export default Logo;
