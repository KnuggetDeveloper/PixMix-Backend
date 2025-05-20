import { GoogleAuth } from 'google-auth-library';

/**
 * Get a valid FCM authorization token for sending notifications
 * Uses service account credentials to authenticate with Google
 * 
 * @returns Valid OAuth2 token for FCM API
 */
export async function getFCMAuthToken(): Promise<string> {
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    if (!token.token) {
      throw new Error('Could not get FCM auth token');
    }
    
    return token.token;
  } catch (error) {
    console.error('Error getting FCM auth token:', error);
    throw error;
  }
}