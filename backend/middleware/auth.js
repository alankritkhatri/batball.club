const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Authentication token is required" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if token is expired
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        return res.status(401).json({ error: "Token has expired" });
      }

      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Set user and user ID for easier access
      req.user = user;
      req.user.id = user._id.toString(); // Ensure ID is available as a string
      req.token = token;
      next();
    } catch (jwtError) {
      return res.status(401).json({ error: "Invalid authentication token" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Server error during authentication" });
  }
};

module.exports = auth;
