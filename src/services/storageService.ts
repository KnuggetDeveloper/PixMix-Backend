import { Storage } from "@google-cloud/storage";
import fs from "fs";
import path from "path";

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

const bucketName = process.env.GCS_BUCKET_NAME || "pixmix-6a12e.appspot.com";
const bucket = storage.bucket(bucketName);

/**
 * Upload a file to Google Cloud Storage
 * 
 * @param localFilePath Path to the local file
 * @param destination Destination path in GCS
 * @returns GCS URI of the uploaded file
 */
export async function uploadToGCS(
  localFilePath: string,
  destination: string
): Promise<string> {
  try {
    // Ensure the file exists
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`File not found: ${localFilePath}`);
    }

    // Upload to GCS
    await bucket.upload(localFilePath, {
      destination,
      metadata: {
        cacheControl: "public, max-age=31536000", // 1 year
      },
    });

    // Return the GCS URI
    return `gs://${bucketName}/${destination}`;
  } catch (error) {
    console.error("Error uploading to GCS:", error);
    throw error;
  }
}

/**
 * Get the public URL for a GCS file
 * 
 * @param gcsUri GCS URI of the file
 * @returns Public URL
 */
export function getPublicUrl(gcsUri: string): string {
  const matches = gcsUri.match(/gs:\/\/([^\/]+)\/(.+)/);
  
  if (!matches) {
    throw new Error(`Invalid GCS URI: ${gcsUri}`);
  }
  
  const [, bucketName, filePath] = matches;
  return `https://storage.googleapis.com/${bucketName}/${filePath}`;
}

/**
 * Delete a file from GCS
 * 
 * @param gcsUri GCS URI of the file to delete
 */
export async function deleteFromGCS(gcsUri: string): Promise<void> {
  try {
    const matches = gcsUri.match(/gs:\/\/([^\/]+)\/(.+)/);
    
    if (!matches) {
      throw new Error(`Invalid GCS URI: ${gcsUri}`);
    }
    
    const [, bucketName, filePath] = matches;
    await storage.bucket(bucketName).file(filePath).delete();
  } catch (error) {
    console.error("Error deleting from GCS:", error);
    throw error;
  }
}