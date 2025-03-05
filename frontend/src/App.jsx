import "./App.css";
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import MainContent from "./components/layout/MainContent";
import AppLayout from "./components/layout/AppLayout";
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
                <AppLayout>
                  <div className="not-found">
                    <h1>404 - Page Not Found</h1>
                    <p>The page you are looking for does not exist.</p>
                  </div>
                </AppLayout>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
