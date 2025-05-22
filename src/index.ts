import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import "./config/firebase"; // Initialize Firebase
// Routes
import generateRoute from "./routes/generate";

// Middleware
import { verifyCloudRunToken } from "./middleware/authMiddleware";

// Services
import { storeUserToken } from "./services/notifications";

// Load environment configuration
dotenv.config();

// Create Express app
const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
const processedDir = path.join(__dirname, "../processed");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}

// CORS configuration
const corsOptions = {
  origin: true, // Allow all origins in development
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400, // 24 hours
};

// Apply global middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle OPTIONS requests explicitly
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check (no auth required)
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    service: "pixmix-backend",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Protected routes - Image processing
app.use("/generate", verifyCloudRunToken, generateRoute);

// FCM token registration endpoint
app.post("/register-token", verifyCloudRunToken, async (req, res, next) => {
  try {
    const { userId, fcmToken, platform } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({
        error: "Missing required fields: userId and fcmToken",
      });
    }

    // Validate the FCM token format (basic check)
    if (typeof fcmToken !== "string" || fcmToken.length < 10) {
      return res.status(400).json({
        error: "Invalid FCM token format",
      });
    }

    await storeUserToken(userId, fcmToken, platform || "ios");

    res.json({
      success: true,
      message: "Token registered successfully",
    });
  } catch (error) {
    next(error);
  }
});
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PixMix Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
