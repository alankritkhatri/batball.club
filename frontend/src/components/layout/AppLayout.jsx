import React from "react";
import Sidebar from "./Sidebar";
import MatchesSidebar from "../features/matches/MatchesSidebar";
import EventsSidebar from "../features/events/EventsSidebar";
import "./AppLayout.css";

const AppLayout = ({ children }) => {
  return (
    <div className="main-container">
      <Sidebar />
      <div className="content-area">{children}</div>
      <div className="right-sidebar">
        <div className="sidebar-section matches-section">
          <MatchesSidebar />
        </div>
        <div className="sidebar-section events-section">
          <EventsSidebar />
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
