import "./App.css";
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import MainContent from "./components/layout/MainContent";
import MatchesSidebar from "./components/features/matches/MatchesSidebar";
import EventsSidebar from "./components/features/events/EventsSidebar";
import ForumPage from "./pages/ForumPage";
import PostPage from "./pages/PostPage";
import CreatePost from "./components/Forum/CreatePost";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Navbar />
          <Routes>
            {/* Home route with main layout */}
            <Route
              path="/"
              element={
                <div className="main-container">
                  <Sidebar />
                  <MainContent />
                  <div className="right-sidebar">
                    <MatchesSidebar />
                    <EventsSidebar />
                  </div>
                </div>
              }
            />

            {/* Match routes */}
            <Route
              path="/matches"
              element={
                <div className="main-container">
                  <Sidebar />
                  <MainContent />
                  <div className="right-sidebar">
                    <MatchesSidebar />
                    <EventsSidebar />
                  </div>
                </div>
              }
            />
            <Route
              path="/matches/:matchId"
              element={
                <div className="main-container">
                  <Sidebar />
                  <MainContent />
                  <div className="right-sidebar">
                    <MatchesSidebar />
                    <EventsSidebar />
                  </div>
                </div>
              }
            />

            {/* Forum routes */}
            <Route path="/forum" element={<ForumPage />} />
            <Route path="/forum/create-post" element={<CreatePost />} />
            <Route path="/forum/post/:postId" element={<PostPage />} />
            {/* Additional routes for direct post access */}
            <Route path="/post/:postId" element={<PostPage />} />
            <Route path="/create-post" element={<CreatePost />} />

            {/* Catch-all route for 404 */}
            <Route
              path="*"
              element={
                <div className="main-container">
                  <h1>404 - Page Not Found</h1>
                </div>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
