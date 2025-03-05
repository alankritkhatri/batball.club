const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    eventType: {
      type: String,
      enum: ["message", "join", "leave"],
      default: "message",
    },
    chatRoom: {
      type: String,
      required: true,
      default: "champions-trophy-finals",
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for efficient querying by chatRoom and creation time
chatMessageSchema.index({ chatRoom: 1, createdAt: -1 });

// Add index for guest users
chatMessageSchema.index({ isGuest: 1, user: 1 });

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

module.exports = ChatMessage;
