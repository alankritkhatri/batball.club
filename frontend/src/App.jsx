import "./App.css";
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import MainContent from "./components/layout/MainContent";
import AppLayout from "./components/layout/AppLayout";
import ForumPage from "./pages/ForumPage";
import PostPage from "./pages/PostPage";
import ChampionsTrophyChat from "./pages/ChampionsTrophyChat";
import LogsPage from "./pages/LogsPage";
import { AuthProvider } from "./context/AuthContext";
import { Analytics } from "@vercel/analytics/react";

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
                <AppLayout>
                  <MainContent />
                </AppLayout>
              }
            />

            {/* Match routes */}
            <Route
              path="/matches"
              element={
                <AppLayout>
                  <MainContent />
                </AppLayout>
              }
            />
            <Route
              path="/matches/:matchId"
              element={
                <AppLayout>
                  <MainContent />
                </AppLayout>
              }
            />

            {/* Champions Trophy Chat */}
            <Route path="/champions-chat" element={<ChampionsTrophyChat />} />

            {/* Forum routes */}
            <Route path="/forum" element={<ForumPage />} />
            <Route path="/forum/post/:postId" element={<PostPage />} />
            {/* Additional routes for direct post access */}
            <Route path="/post/:postId" element={<PostPage />} />

            {/* Redirect create-post to forum with query parameter */}
            <Route
              path="/create-post"
              element={<Navigate to="/forum?showCreatePost=true" replace />}
            />
            <Route
              path="/forum/create-post"
              element={<Navigate to="/forum?showCreatePost=true" replace />}
            />

            {/* Logs route */}
            <Route path="/logs" element={<LogsPage />} />

            {/* Catch-all route for 404 */}
            <Route
              path="*"
              element={
                <AppLayout>
                  <div className="not-found">
                    <h1>404 - Page Not Found</h1>
                    <p>The page you are looking for does not exist.</p>
                  </div>
                </AppLayout>
              }
            />
          </Routes>
          <Analytics />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
