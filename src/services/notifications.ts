import fetch from "node-fetch";
import { getFCMAuthToken } from "../utils/google-auth";

// FCM API URL
const FCM_API_URL = `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`;

/**
 * Sends a push notification when image processing is complete
 * 
 * @param deviceToken FCM device token
 * @param imageUrl URL of the processed image
 * @param filterType Type of filter applied
 * @returns Response from FCM API
 */
export async function sendNotification(
  deviceToken: string,
  imageUrl: string,
  filterType: string
): Promise<any> {
  try {
    // Get FCM authorization token
    const fcmToken = await getFCMAuthToken();
    
    // Build notification payload
    const message = {
      message: {
        token: deviceToken,
        notification: {
          title: "Image Ready!",
          body: `Your ${filterType} filter has been applied successfully.`,
        },
        data: {
          notificationType: "image_ready",
          imageUrl: imageUrl,
          filterType: filterType,
          timestamp: new Date().toISOString(),
        },
        android: {
          notification: {
            channel_id: "image-processing",
            priority: "HIGH",
            icon: "notification_icon",
            color: "#0a7ea4",
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: "default",
            },
          },
        },
      },
    };
    
    // Send notification
    const response = await fetch(FCM_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fcmToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`FCM error: ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
}

/**
 * Store a user's FCM token in the database
 * 
 * @param userId User ID
 * @param fcmToken FCM device token
 * @param platform Device platform (ios/android)
 */
export async function storeUserToken(
  userId: string,
  fcmToken: string,
  platform: string = "ios"
): Promise<void> {
  try {
    // Store in Firestore using the Firebase Admin SDK
    const { firestore } = require("../config/firebase");
    
    await firestore.collection("user_tokens").doc(userId).set(
      {
        fcmToken,
        platform,
        lastUpdated: new Date(),
        userId,
      },
      { merge: true }
    );
    
    console.log(`Token stored for user ${userId}`);
  } catch (error) {
    console.error("Error storing user token:", error);
    throw error;
  }
}

/**
 * Retrieve a user's FCM token from the database
 * 
 * @param userId User ID
 * @returns FCM device token
 */
export async function getUserToken(userId: string): Promise<string | null> {
  try {
    const { firestore } = require("../config/firebase");
    
    const doc = await firestore.collection("user_tokens").doc(userId).get();
    
    if (doc.exists) {
      return doc.data().fcmToken;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user token:", error);
    return null;
  }
}