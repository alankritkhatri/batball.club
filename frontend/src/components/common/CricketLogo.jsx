import React from "react";
import "./CricketLogo.css";

const CricketLogo = ({ size = "medium" }) => {
  return (
    <div className={`cricket-logo cricket-logo-${size}`}>
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="cricket-logo-svg"
      >
        {/* Cricket Bat */}
        <g className="cricket-bat">
          {/* Bat blade */}
          <path
            d="M35 30L40 70L55 85L70 70L55 30L45 25L35 30Z"
            fill="#F0D0A0"
            stroke="#1E1E1E"
            strokeWidth="2"
          />

          {/* Bat shoulder with chevron design */}
          <path
            d="M35 30L45 25L55 30L45 35L35 30Z"
            fill="#4682B4"
            stroke="#1E1E1E"
            strokeWidth="1"
          />

          {/* Chevron design on bat shoulder */}
          <path
            d="M38 30L45 27L52 30L45 33L38 30Z"
            fill="#1E90FF"
            stroke="#1E1E1E"
            strokeWidth="0.5"
          />

          {/* Bat handle with grip pattern - straight and properly connected */}
          <rect x="41" y="5" width="8" height="20" rx="3" fill="#8B4513" />

          {/* Grip pattern */}
          <g>
            <rect x="41" y="5" width="8" height="2" fill="#FF0000" />
            <rect x="41" y="9" width="8" height="2" fill="#FF0000" />
            <rect x="41" y="13" width="8" height="2" fill="#FF0000" />
            <rect x="41" y="17" width="8" height="2" fill="#FF0000" />
            <rect x="41" y="21" width="8" height="2" fill="#FF0000" />
          </g>
        </g>

        {/* Cricket Ball */}
        <circle
          className="cricket-ball"
          cx="75"
          cy="40"
          r="12"
          fill="#B22222"
        />

        {/* Ball Seam */}
        <path
          d="M75 28 C 81 34, 81 46, 75 52"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="ball-seam"
        />
        <path
          d="M75 28 C 69 34, 69 46, 75 52"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="ball-seam"
        />
      </svg>
    </div>
  );
};

export default CricketLogo;
