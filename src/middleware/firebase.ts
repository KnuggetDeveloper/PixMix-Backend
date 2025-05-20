import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import { verifyFirebaseIdToken } from "../config/firebase";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: admin.auth.DecodedIdToken;
    }
  }
}

/**
 * Middleware to verify Firebase authentication token
 * 
 * This middleware extracts the Bearer token from the Authorization header,
 * verifies it with Firebase Auth, and attaches the user data to the request.
 */
export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      const decodedToken = await verifyFirebaseIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error("Firebase token verification failed:", error);
      res.status(403).json({ error: "Unauthorized: Invalid token" });
    }
  } catch (error) {
    console.error("Error in Firebase auth middleware:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Verify a Firebase ID token directly
 * 
 * This function can be used outside of the middleware context
 * when you need to verify a token.
 * 
 * @param token Firebase ID token to verify
 * @returns True if token is valid, false otherwise
 */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    await verifyFirebaseIdToken(token);
    return true;
  } catch (error) {
    return false;
  }
}