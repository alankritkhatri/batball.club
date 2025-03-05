import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import logService from "./services/LogService";

// Initialize log service as early as possible to capture all logs from application start
logService.init();
console.log(
  "Application starting - all console logs will be captured and available at /logs"
);

// Add error event listener to capture uncaught errors
window.addEventListener("error", (event) => {
  console.error("Uncaught error:", event.error?.message || "Unknown error");
  event.preventDefault();
});

// Add unhandled promise rejection listener
window.addEventListener("unhandledrejection", (event) => {
  console.error(
    "Unhandled promise rejection:",
    event.reason?.message || event.reason || "Unknown reason"
  );
  event.preventDefault();
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
