const mongoose = require("mongoose");
require("dotenv").config();

const initializeDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: "batball",
    });

    console.log("Connected to MongoDB - Initializing database...");

    // Get the database instance
    const db = mongoose.connection.db;

    // Create collections if they don't exist
    await db.createCollection("users", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["username", "email", "password"],
          properties: {
            username: {
              bsonType: "string",
              description: "must be a string and is required",
            },
            email: {
              bsonType: "string",
              pattern: "^.+@.+\\..+$",
              description: "must be a valid email address and is required",
            },
            password: {
              bsonType: "string",
              description: "must be a string and is required",
            },
          },
        },
      },
    });

    await db.createCollection("posts", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["title", "content", "author"],
          properties: {
            title: {
              bsonType: "string",
              description: "must be a string and is required",
            },
            content: {
              bsonType: "string",
              description: "must be a string and is required",
            },
            author: {
              bsonType: "objectId",
              description: "must be an objectId and is required",
            },
          },
        },
      },
    });

    // Create indexes
    const usersCollection = db.collection("users");
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ username: 1 }, { unique: true });

    const postsCollection = db.collection("posts");
    await postsCollection.createIndex({ author: 1 });
    await postsCollection.createIndex({ createdAt: -1 });

    console.log("Database initialization completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
};

initializeDatabase();
