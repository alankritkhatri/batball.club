const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    console.log("Auth header:", authHeader);

    const token = authHeader?.replace("Bearer ", "");

    // Log token (first few characters for security)
    if (token) {
      console.log(
        "Token received (first 10 chars):",
        token.substring(0, 10) + "..."
      );
    } else {
      console.log("No token received");
    }

    if (!token) {
      return res
        .status(401)
        .json({ error: "Authentication token is required" });
    }

    try {
      console.log("Verifying token with JWT_SECRET");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token decoded successfully, userId:", decoded.userId);

      // Check if token is expired
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        console.log("Token has expired");
        return res.status(401).json({ error: "Token has expired" });
      }

      const user = await User.findById(decoded.userId);

      if (!user) {
        console.log("User not found for userId:", decoded.userId);
        return res.status(401).json({ error: "User not found" });
      }

      console.log("User authenticated:", user.username);

      // Set user and user ID for easier access
      req.user = user;
      req.user.id = user._id.toString(); // Ensure ID is available as a string
      req.token = token;
      next();
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError.message);
      return res.status(401).json({ error: "Invalid authentication token" });
    }
  } catch (error) {
    console.error("Server error during authentication:", error);
    return res
      .status(500)
      .json({ error: "Server error during authentication" });
  }
};

module.exports = auth;
