import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { processImageWithAI } from "../services/openaiService";
import { uploadToGCS, getPublicUrl } from "../services/storageService";
import { sendNotification } from "../services/notifications";

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const router = Router();

router.post("/", upload.single("image"), async (req: Request, res: Response) => {
  try {
    // Validate request
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    
    const { filter, fcmToken } = req.body;
    
    if (!filter) {
      return res.status(400).json({ error: "Filter type is required" });
    }

    // Process image
    console.log(`Processing image with ${filter} filter...`);
    
    // 1. Upload original to GCS
    const gcsPath = await uploadToGCS(req.file.path, `originals/${req.file.filename}`);
    console.log(`Uploaded original image to ${gcsPath}`);
    
    // 2. Process with OpenAI
    const resultImagePath = await processImageWithAI(req.file.path, filter);
    console.log(`OpenAI processing complete: ${resultImagePath}`);
    
    // 3. Upload processed image to GCS
    const processedImageGcsPath = await uploadToGCS(
      resultImagePath,
      `processed/${path.basename(resultImagePath)}`
    );
    console.log(`Uploaded processed image to ${processedImageGcsPath}`);
    
    // 4. Get public URL
    const publicUrl = getPublicUrl(processedImageGcsPath);
    
    // 5. Send notification if FCM token provided
    if (fcmToken) {
      try {
        await sendNotification(fcmToken, publicUrl, filter);
        console.log(`Notification sent to token: ${fcmToken}`);
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
        // Continue anyway - notification failure shouldn't fail the request
      }
    }
    
    // Send response
    res.json({
      success: true,
      imageUrl: publicUrl,
      filter,
    });
  } catch (error) {
    console.error("Error in image processing:", error);
    res.status(500).json({
      error: "Image processing failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;