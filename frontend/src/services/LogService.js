/**
 * LogService.js
 * A service for capturing and storing console logs across the application
 */

class LogService {
  constructor() {
    // Configuration
    this.MAX_LOGS = 500; // Reduced from 1000 for mobile
    this.STORAGE_KEY = "console_logs";
    this.isInitialized = false;
    this.listeners = [];
    this.logs = [];

    // Check storage availability
    this.storageAvailable = this.checkStorageAvailability();

    // Try to load existing logs
    if (this.storageAvailable) {
      try {
        const storedLogs = sessionStorage.getItem(this.STORAGE_KEY);
        this.logs = storedLogs ? JSON.parse(storedLogs) : [];
      } catch (error) {
        console.warn("Failed to load stored logs:", error);
        this.logs = [];
      }
    }
  }

  /**
   * Check if storage is available and working
   */
  checkStorageAvailability() {
    try {
      const storage = window.sessionStorage;
      const testKey = "__storage_test__";
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Save logs with error handling and size management
   */
  saveToSessionStorage() {
    if (!this.storageAvailable) return;

    try {
      // Keep only recent logs to manage storage size
      const logsToStore = this.logs.slice(-this.MAX_LOGS);

      // Estimate size before saving
      const logsString = JSON.stringify(logsToStore);
      if (logsString.length > 4.5 * 1024 * 1024) {
        // 4.5MB limit to be safe
        // If too large, remove older logs
        this.logs = this.logs.slice(-Math.floor(this.MAX_LOGS / 2));
        this.saveToSessionStorage(); // Try again with fewer logs
        return;
      }

      sessionStorage.setItem(this.STORAGE_KEY, logsString);
    } catch (error) {
      if (
        error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED"
      ) {
        // If storage is full, remove half of the old logs
        this.logs = this.logs.slice(-Math.floor(this.MAX_LOGS / 2));
        this.saveToSessionStorage(); // Try again with fewer logs
      } else {
        console.warn("Failed to save logs:", error);
      }
    }
  }

  /**
   * Format log content safely
   */
  formatLogContent(arg) {
    try {
      if (arg instanceof Error) {
        return `Error Details:\n${JSON.stringify(
          {
            name: arg.name,
            message: arg.message,
            stack: arg.stack,
            details: Object.getOwnPropertyNames(arg).reduce((acc, key) => {
              if (!["name", "message", "stack"].includes(key)) {
                try {
                  acc[key] = arg[key];
                } catch (e) {
                  acc[key] = "[Unable to serialize property]";
                }
              }
              return acc;
            }, {}),
          },
          null,
          2
        )}`;
      }

      if (typeof arg === "object" && arg !== null) {
        try {
          return `Object Details:\n${JSON.stringify(
            arg,
            (key, value) => {
              if (value instanceof Error) {
                return `[Error: ${value.message}]`;
              }
              if (typeof value === "function") {
                return "[Function]";
              }
              if (value instanceof HTMLElement) {
                return `[HTMLElement: ${value.tagName}]`;
              }
              return value;
            },
            2
          )}`;
        } catch (e) {
          return `[Complex Object: ${typeof arg}]`;
        }
      }

      return String(arg);
    } catch (e) {
      return "[Failed to format log content]";
    }
  }

  /**
   * Create a log entry with safe formatting
   */
  createLogEntry(type, args) {
    const timestamp = new Date().toISOString();
    return {
      type,
      timestamp,
      content: args.map((arg) => this.formatLogContent(arg)).join("\n"),
      device: {
        isMobile: /Mobile|Android|iPhone/i.test(navigator.userAgent),
        userAgent: navigator.userAgent,
      },
    };
  }

  /**
   * Initialize the log service by overriding console methods
   */
  init() {
    if (this.isInitialized) return;

    // Store original console methods
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };

    // Override each console method
    ["log", "error", "warn", "info", "debug"].forEach((method) => {
      console[method] = (...args) => {
        const logEntry = this.createLogEntry(method, args);

        // Keep log count under control
        if (this.logs.length >= this.MAX_LOGS) {
          this.logs = this.logs.slice(-Math.floor(this.MAX_LOGS / 2));
        }

        this.logs.push(logEntry);

        // Throttle storage saves on mobile
        if (!this._saveTimeout) {
          this._saveTimeout = setTimeout(() => {
            this.saveToSessionStorage();
            this._saveTimeout = null;
          }, 1000);
        }

        this.notifyListeners();
        this.originalConsole[method].apply(console, args);
      };
    });

    // Add event listener for beforeunload
    window.addEventListener("beforeunload", () => {
      if (this._saveTimeout) {
        clearTimeout(this._saveTimeout);
        this.saveToSessionStorage();
      }
    });

    this.isInitialized = true;
    this.originalConsole.log(
      "LogService initialized - Mobile-friendly version"
    );
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
