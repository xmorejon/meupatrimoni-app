import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export the initialized services
export const db = admin.firestore();
export const auth = admin.auth();
export { admin };
