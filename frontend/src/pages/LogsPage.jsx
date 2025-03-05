import React, { useState, useEffect } from "react";
import logService from "../services/LogService";
import "./LogsPage.css";

const LogsPage = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Initialize the log service if not already initialized
    logService.init();

    // Set initial logs
    setLogs(logService.getLogs());

    // Add listener for log updates
    const handleLogsUpdate = (updatedLogs) => {
      setLogs([...updatedLogs]);
    };

    logService.addListener(handleLogsUpdate);

    // Generate a test log to show the page is working
    console.log("Logs page accessed");

    // Cleanup function
    return () => {
      logService.removeListener(handleLogsUpdate);
    };
  }, []);

  const clearLogs = () => {
    logService.clearLogs();
  };

  return (
    <div className="logs-container">
      <div className="logs-header">
        <h1>Console Logs</h1>
        <button className="clear-logs-btn" onClick={clearLogs}>
          Clear Logs
        </button>
      </div>
      <div className="logs-content">
        {logs.length === 0 ? (
          <div className="no-logs">No logs captured yet</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={`log-entry log-${log.type}`}>
              <span className="log-timestamp">{log.timestamp}</span>
              <span className="log-type">[{log.type.toUpperCase()}]</span>
              <pre className="log-message">{log.content}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogsPage;
