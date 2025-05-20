import admin from "firebase-admin";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Check if Firebase environment variables are set
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKeyRaw) {
  console.error("Missing Firebase credentials in environment variables:");
  console.error(`  FIREBASE_PROJECT_ID: ${projectId ? "Set" : "Missing"}`);
  console.error(`  FIREBASE_CLIENT_EMAIL: ${clientEmail ? "Set" : "Missing"}`);
  console.error(`  FIREBASE_PRIVATE_KEY: ${privateKeyRaw ? "Set" : "Missing"}`);
  throw new Error(
    "Firebase configuration is incomplete. Check your environment variables."
  );
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: `${projectId}.appspot.com`,
    });
    
    console.log("Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
    throw error;
  }
}

// Export Firebase services
export const firestore = admin.firestore();
export const storage = admin.storage().bucket();
export const messaging = admin.messaging();

/**
 * Verify a Firebase ID token
 * 
 * @param idToken Firebase ID token to verify
 * @returns Firebase user data
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    throw new Error("Invalid Firebase ID token");
  }
}