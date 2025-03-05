/**
 * LogService.js
 * A service for capturing and storing console logs across the application
 */

class LogService {
  constructor() {
    // Try to load logs from sessionStorage
    try {
      const storedLogs = sessionStorage.getItem("console_logs");
      this.logs = storedLogs ? JSON.parse(storedLogs) : [];
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      this.logs = [];
    }

    this.listeners = [];
    this.isInitialized = false;
  }

  /**
   * Initialize the log service by overriding console methods
   */
  init() {
    if (this.isInitialized) {
      return;
    }

    // Store original console methods
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };

    // Override console.log
    console.log = (...args) => {
      const timestamp = new Date().toISOString();
      const logEntry = {
        type: "log",
        timestamp,
        content: args
          .map((arg) => {
            if (arg instanceof Error) {
              return `Error Details:\n${JSON.stringify(
                {
                  name: arg.name,
                  message: arg.message,
                  stack: arg.stack,
                  details: Object.getOwnPropertyNames(arg).reduce(
                    (acc, key) => {
                      if (!["name", "message", "stack"].includes(key)) {
                        acc[key] = arg[key];
                      }
                      return acc;
                    },
                    {}
                  ),
                },
                null,
                2
              )}`;
            }
            if (typeof arg === "object" && arg !== null) {
              return `Object Details:\n${JSON.stringify(arg, null, 2)}`;
            }
            return String(arg);
          })
          .join("\n"),
      };
      this.logs.push(logEntry);
      this.saveToSessionStorage();
      this.notifyListeners();
      this.originalConsole.log.apply(console, args);
    };

    // Override console.error
    console.error = (...args) => {
      const timestamp = new Date().toISOString();
      const logEntry = {
        type: "error",
        timestamp,
        content: args
          .map((arg) => {
            if (arg instanceof Error) {
              return `Error Details:\n${JSON.stringify(
                {
                  name: arg.name,
                  message: arg.message,
                  stack: arg.stack,
                  details: Object.getOwnPropertyNames(arg).reduce(
                    (acc, key) => {
                      if (!["name", "message", "stack"].includes(key)) {
                        acc[key] = arg[key];
                      }
                      return acc;
                    },
                    {}
                  ),
                },
                null,
                2
              )}`;
            }
            if (typeof arg === "object" && arg !== null) {
              return `Object Details:\n${JSON.stringify(arg, null, 2)}`;
            }
            return String(arg);
          })
          .join("\n"),
      };
      this.logs.push(logEntry);
      this.saveToSessionStorage();
      this.notifyListeners();
      this.originalConsole.error.apply(console, args);
    };

    // Override console.warn
    console.warn = (...args) => {
      const timestamp = new Date().toISOString();
      const logEntry = {
        type: "warn",
        timestamp,
        content: args
          .map((arg) => {
            if (arg instanceof Error) {
              return `Error Details:\n${JSON.stringify(
                {
                  name: arg.name,
                  message: arg.message,
                  stack: arg.stack,
                  details: Object.getOwnPropertyNames(arg).reduce(
                    (acc, key) => {
                      if (!["name", "message", "stack"].includes(key)) {
                        acc[key] = arg[key];
                      }
                      return acc;
                    },
                    {}
                  ),
                },
                null,
                2
              )}`;
            }
            if (typeof arg === "object" && arg !== null) {
              return `Object Details:\n${JSON.stringify(arg, null, 2)}`;
            }
            return String(arg);
          })
          .join("\n"),
      };
      this.logs.push(logEntry);
      this.saveToSessionStorage();
      this.notifyListeners();
      this.originalConsole.warn.apply(console, args);
    };

    // Override console.info
    console.info = (...args) => {
      const timestamp = new Date().toISOString();
      const logEntry = {
        type: "info",
        timestamp,
        content: args
          .map((arg) => {
            if (arg instanceof Error) {
              return `Error Details:\n${JSON.stringify(
                {
                  name: arg.name,
                  message: arg.message,
                  stack: arg.stack,
                  details: Object.getOwnPropertyNames(arg).reduce(
                    (acc, key) => {
                      if (!["name", "message", "stack"].includes(key)) {
                        acc[key] = arg[key];
                      }
                      return acc;
                    },
                    {}
                  ),
                },
                null,
                2
              )}`;
            }
            if (typeof arg === "object" && arg !== null) {
              return `Object Details:\n${JSON.stringify(arg, null, 2)}`;
            }
            return String(arg);
          })
          .join("\n"),
      };
      this.logs.push(logEntry);
      this.saveToSessionStorage();
      this.notifyListeners();
      this.originalConsole.info.apply(console, args);
    };

    // Override console.debug
    console.debug = (...args) => {
      const timestamp = new Date().toISOString();
      const logEntry = {
        type: "debug",
        timestamp,
        content: args
          .map((arg) => {
            if (arg instanceof Error) {
              return `Error Details:\n${JSON.stringify(
                {
                  name: arg.name,
                  message: arg.message,
                  stack: arg.stack,
                  details: Object.getOwnPropertyNames(arg).reduce(
                    (acc, key) => {
                      if (!["name", "message", "stack"].includes(key)) {
                        acc[key] = arg[key];
                      }
                      return acc;
                    },
                    {}
                  ),
                },
                null,
                2
              )}`;
            }
            if (typeof arg === "object" && arg !== null) {
              return `Object Details:\n${JSON.stringify(arg, null, 2)}`;
            }
            return String(arg);
          })
          .join("\n"),
      };
      this.logs.push(logEntry);
      this.saveToSessionStorage();
      this.notifyListeners();
      this.originalConsole.debug.apply(console, args);
    };

    // Add event listener for beforeunload to capture logs until the very end of the session
    window.addEventListener("beforeunload", () => {
      this.saveToSessionStorage();
    });

    this.isInitialized = true;
    this.originalConsole.log(
      "LogService initialized and capturing all console output"
    );
  }

  /**
   * Save logs to sessionStorage
   */
  saveToSessionStorage() {
    try {
      // Limit the number of logs to prevent exceeding storage limits
      const logsToStore = this.logs.slice(-1000); // Store last 1000 logs
      sessionStorage.setItem("console_logs", JSON.stringify(logsToStore));
    } catch (error) {
      if (this.originalConsole) {
        this.originalConsole.error(
          "Error saving logs to sessionStorage:",
          error
        );
      }
    }
  }

  /**
   * Restore original console methods
   */
  restore() {
    if (!this.isInitialized || !this.originalConsole) {
      return;
    }

    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;

    this.isInitialized = false;
  }

  /**
   * Get all captured logs
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Clear all captured logs
   */
  clearLogs() {
    this.logs = [];
    this.saveToSessionStorage();
    this.notifyListeners();
  }

  /**
   * Add a listener function to be called when logs change
   */
  addListener(listener) {
    if (typeof listener === "function") {
      this.listeners.push(listener);
    }
  }

  /**
   * Remove a listener function
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  /**
   * Notify all listeners of log changes
   */
  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.logs);
      } catch (error) {
        if (this.originalConsole) {
          this.originalConsole.error("Error in log listener:", error);
        }
      }
    });
  }
}

// Create a singleton instance
const logService = new LogService();

export default logService;
