import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import "./ChampionsTrophyChat.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const CHAT_ROOM = "champions-trophy-finals";
const LOCAL_STORAGE_KEY = "champions-trophy-chat-messages";

// Helper function to get mock messages from local storage
const getLocalMessages = () => {
  try {
    const storedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
    return storedMessages ? JSON.parse(storedMessages) : [];
  } catch (error) {
    console.error("Error reading from local storage:", error);
    return [];
  }
};

// Helper function to save mock messages to local storage
const saveLocalMessages = (messages) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error("Error saving to local storage:", error);
  }
};

const ChampionsTrophyChat = () => {
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const [messages, setMessages] = useState(getLocalMessages());
  const [messageInput, setMessageInput] = useState("");
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [connectionError, setConnectionError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);
  const [guestUsername, setGuestUsername] = useState("");
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [guestId, setGuestId] = useState("");
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const connectionAttempts = useRef(0);
  const maxConnectionAttempts = 3;
  const hasJoinedRoom = useRef(false); // Track if we've already joined the room

  // Check for saved guest username in localStorage
  useEffect(() => {
    const savedGuestUsername = localStorage.getItem("guest_username");
    const savedGuestId = localStorage.getItem("guest_id");

    if (savedGuestUsername && !isAuthenticated) {
      setGuestUsername(savedGuestUsername);
      setIsGuest(true);

      // Use saved guest ID or create a new one
      if (savedGuestId) {
        setGuestId(savedGuestId);
      } else {
        const newGuestId = `guest-${Date.now()}`;
        setGuestId(newGuestId);
        localStorage.setItem("guest_id", newGuestId);
      }
    }
  }, [isAuthenticated]);

  // Initialize socket connection - only when auth changes or guest status changes
  useEffect(() => {
    // Only initialize socket if user is authenticated or guest has a username
    if ((!isAuthenticated && !isGuest) || (isAuthenticated && !user)) {
      console.log(
        "Not initializing socket - user not authenticated and not a guest"
      );
      return;
    }

    // Reset the joined flag when creating a new socket
    hasJoinedRoom.current = false;
    connectionAttempts.current = 0;

    let newSocket;
    try {
      console.log("Attempting to connect to socket server at:", API_BASE_URL);
      // Add connection options to handle errors better
      newSocket = io(API_BASE_URL, {
        reconnectionAttempts: 5,
        timeout: 20000,
        transports: ["websocket", "polling"],
        path: "/socket.io/",
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
        forceNew: true,
        auth: {
          userId: isAuthenticated ? user?._id : guestId,
          token: localStorage.getItem("token") || "guest",
          isGuest: isGuest,
        },
      });
      setSocket(newSocket);

      // Handle connection error
      newSocket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
        connectionAttempts.current += 1;

        if (connectionAttempts.current >= maxConnectionAttempts) {
          setConnectionError(true);
          setErrorMessage(
            `Unable to connect to chat server: ${err.message}. Using offline mode.`
          );
          setIsConnected(false);
          setUsingFallback(true);

          // Load mock data if we're using the fallback
          if (getLocalMessages().length === 0) {
            const mockMessages = [
              {
                _id: "mock1",
                username: "System",
                message:
                  "Welcome to Champions Trophy Finals chat (offline mode)",
                eventType: "join",
                createdAt: new Date().toISOString(),
              },
              {
                _id: "mock2",
                username: "CricketFan",
                message: "Can't wait for the finals to begin!",
                eventType: "message",
                createdAt: new Date(Date.now() - 3600000).toISOString(),
              },
            ];
            setMessages(mockMessages);
            saveLocalMessages(mockMessages);
          }
        }
      });

      // Handle connection timeout
      newSocket.on("connect_timeout", () => {
        console.error("Socket connection timeout");
        setConnectionError(true);
        setErrorMessage(
          "Connection to chat server timed out. Please try again later."
        );
        setIsConnected(false);
      });

      // Clean up on unmount
      return () => {
        if (newSocket) {
          console.log("Cleaning up socket connection");
          // Remove all listeners to prevent memory leaks
          newSocket.removeAllListeners();
          newSocket.disconnect();
          setSocket(null);
          setIsConnected(false);
        }
      };
    } catch (error) {
      console.error("Error initializing socket:", error);
      setConnectionError(true);
      setErrorMessage(
        "Failed to initialize chat connection. Please try again later."
      );
    }
  }, [isAuthenticated, user?._id, isGuest, guestUsername, guestId]); // Add guestId to dependencies

  // Handle socket events
  useEffect(() => {
    if (!socket) return;

    // Connection events
    socket.on("connect", () => {
      setIsConnected(true);
      setConnectionError(false);
      setUsingFallback(false);
      console.log("Connected to socket server");

      // Join the chat room if authenticated or guest and not already joined
      if (!hasJoinedRoom.current) {
        const userData = isAuthenticated
          ? { id: user._id, username: user.username }
          : { id: guestId, username: guestUsername };

        // Only join if we have the necessary data
        if (
          (isAuthenticated && userData.id) ||
          (isGuest && userData.id && userData.username)
        ) {
          console.log("Joining room with user:", {
            ...userData,
            room: CHAT_ROOM,
            isGuest: isGuest,
          });

          socket.emit("join_room", {
            userId: userData.id,
            username: userData.username,
            room: CHAT_ROOM,
            isGuest: isGuest,
          });

          hasJoinedRoom.current = true;
        } else {
          console.log("Not joining room - missing required data:", userData);
        }
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Disconnected from socket server");
    });

    // Chat events
    socket.on("chat_history", (history) => {
      setMessages(history);
      // Also save to local storage as a backup
      saveLocalMessages(history);
    });

    socket.on("receive_message", (message) => {
      // Use functional update to avoid dependency on messages array
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, message];
        // Also save to local storage as a backup
        saveLocalMessages(updatedMessages);
        return updatedMessages;
      });
    });

    socket.on("online_users", (count) => {
      setOnlineUsers(count);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
      setErrorMessage(
        `An error occurred in the chat: ${error.message || "Unknown error"}`
      );
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("chat_history");
      socket.off("receive_message");
      socket.off("online_users");
      socket.off("error");
      socket.off("connect_error");
      socket.off("connect_timeout");
    };
  }, [socket, isAuthenticated, isGuest, guestUsername, guestId]); // Add guestId to dependencies

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!isAuthenticated && !isGuest) {
      setShowGuestPrompt(true);
      return;
    }

    if (!messageInput.trim()) return;

    // If we're connected to the socket, send through socket
    if (socket && isConnected && !usingFallback) {
      // For authenticated users
      if (isAuthenticated) {
        if (!user || !user._id) {
          console.error("User ID is missing when trying to send message");
          setErrorMessage(
            "Unable to send message: User information is missing"
          );
          return;
        }

        const messageData = {
          userId: user._id,
          username: user.username,
          message: messageInput,
          room: CHAT_ROOM,
          isGuest: false,
        };

        console.log("Sending message data:", messageData);
        socket.emit("send_message", messageData);
      }
      // For guest users
      else if (isGuest) {
        const messageData = {
          userId: guestId,
          username: guestUsername,
          message: messageInput,
          room: CHAT_ROOM,
          isGuest: true,
        };

        console.log("Sending guest message data:", messageData);
        socket.emit("send_message", messageData);
      }
    }
    // Otherwise use the fallback local storage method
    else if (usingFallback) {
      const newMessage = {
        _id: `local-${Date.now()}`,
        username: isAuthenticated
          ? user?.username || "You"
          : guestUsername || "Guest",
        message: messageInput,
        eventType: "message",
        createdAt: new Date().toISOString(),
      };

      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      saveLocalMessages(updatedMessages);
    }

    setMessageInput("");
  };

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    if (guestUsername.trim()) {
      // Create a persistent guest ID
      const newGuestId = `guest-${Date.now()}`;
      setGuestId(newGuestId);

      localStorage.setItem("guest_username", guestUsername);
      localStorage.setItem("guest_id", newGuestId);
      setIsGuest(true);
      setShowGuestPrompt(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Render the guest username prompt
  const renderGuestPrompt = () => {
    return (
      <div className="guest-prompt-overlay">
        <div className="guest-prompt-container">
          <h2>Join as Guest</h2>
          <p>Enter a username to chat as a guest</p>
          <form onSubmit={handleGuestSubmit}>
            <input
              type="text"
              value={guestUsername}
              onChange={(e) => setGuestUsername(e.target.value)}
              placeholder="Enter a username"
              maxLength={20}
              required
            />
            <div className="guest-prompt-buttons">
              <button type="button" onClick={() => setShowGuestPrompt(false)}>
                Cancel
              </button>
              <button type="submit">Join Chat</button>
            </div>
          </form>
          <div className="guest-prompt-login">
            <p>Want to save your messages?</p>
            <button
              type="button"
              onClick={() => {
                setShowGuestPrompt(false);
                openLoginModal("Create an account to save your messages");
              }}
            >
              Login or Register
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render a fallback UI when there's a connection error but not using fallback
  if (connectionError && !usingFallback) {
    return (
      <div className="champions-chat-container">
        <div className="chat-header">
          <h1>Champions Trophy Finals - Live Chat</h1>
        </div>
        <div className="chat-error">
          <div className="error-icon">⚠️</div>
          <h2>Connection Error</h2>
          <p>{errorMessage}</p>
          <p className="error-details">
            The chat feature requires a WebSocket connection which appears to be
            unavailable. This might be because:
          </p>
          <ul>
            <li>The chat server is currently down for maintenance</li>
            <li>Your network connection is blocking WebSocket connections</li>
            <li>The backend service hasn't been fully deployed yet</li>
          </ul>
          <div className="error-actions">
            <button
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Retry Connection
            </button>
            <button
              className="fallback-button"
              onClick={() => setUsingFallback(true)}
            >
              Use Offline Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="champions-chat-container">
      {showGuestPrompt && renderGuestPrompt()}
      <div className="chat-header">
        <h1>Champions Trophy Finals - Live Chat</h1>
        <div className="chat-status">
          {isConnected ? (
            <span className="status-connected">
              <span className="status-dot"></span>
              Connected ({onlineUsers} online)
            </span>
          ) : (
            <span className="status-disconnected">
              <span className="status-dot"></span>
              Disconnected
            </span>
          )}
          {isGuest && (
            <span className="guest-badge">Guest: {guestUsername}</span>
          )}
          {usingFallback && (
            <span className="offline-indicator">Offline Mode</span>
          )}
        </div>
      </div>

      <div className="chat-content">
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="no-messages">
              {usingFallback
                ? "Offline mode active. Your messages will be stored locally."
                : "Connecting to chat server..."}
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg._id}
                className={`message ${
                  msg.eventType === "join" ? "system-message" : ""
                } ${
                  isAuthenticated && user && msg.username === user.username
                    ? "own-message"
                    : ""
                } ${
                  isGuest && msg.username === guestUsername ? "own-message" : ""
                }`}
              >
                {msg.eventType === "join" ? (
                  <div className="message-content system-content">
                    {msg.message}
                  </div>
                ) : (
                  <>
                    <div className="message-header">
                      <span className="message-username">{msg.username}</span>
                      <span className="message-time">
                        {formatTimestamp(msg.createdAt)}
                      </span>
                    </div>
                    <div className="message-content">{msg.message}</div>
                  </>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <form onSubmit={handleSendMessage}>
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={
                isAuthenticated
                  ? "Type your message..."
                  : isGuest
                  ? `Type your message as ${guestUsername}...`
                  : "Enter as guest or login to chat..."
              }
              disabled={
                (!isAuthenticated && !isGuest) ||
                (!isConnected && !usingFallback)
              }
              maxLength={500}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={
                (!isAuthenticated && !isGuest) ||
                (!isConnected && !usingFallback) ||
                !messageInput.trim()
              }
            >
              Send
            </button>
          </form>
          {!isAuthenticated && !isGuest && (
            <div className="chat-login-prompt">
              <button onClick={() => setShowGuestPrompt(true)}>
                Chat as Guest
              </button>
              <span>or</span>
              <button onClick={() => openLoginModal()}>Login</button>
            </div>
          )}
          {usingFallback && (
            <div className="fallback-notice">
              You are in offline mode. Messages will be stored locally.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChampionsTrophyChat;
