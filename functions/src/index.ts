import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import { URLSearchParams } from "url";

admin.initializeApp();

// Define the secrets we need for the function
const secrets = ["POWENS_CLIENT_ID", "POWENS_CLIENT_SECRET"];

/**
 * A callable function to get an access token from the Powens API.
 * This function uses the new secret management system.
 */
export const getPowensAccessToken = functions
    .region("europe-west1") // Set the region to Europe
    .runWith({ secrets })
    .https.onCall(async (data, context) => {
    // 1. Check if the user is authenticated.
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'The function must be called while authenticated.'
        );
    }

    // 2. Retrieve secret values from environment variables.
    const clientId = process.env.POWENS_CLIENT_ID;
    const clientSecret = process.env.POWENS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new functions.https.HttpsError('internal', 'Server configuration error: missing secrets.');
    }

    try {
        // 3. Prepare the request to the Powens API.
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);

        // 4. Make the server-to-server request.
        const response = await axios.post('https://api.powens.com/v2/auth/access-token', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        // 5. Return the access token to the client.
        if (response.data && response.data.access_token) {
            return { accessToken: response.data.access_token };
        } else {
            console.error("Unexpected response format from Powens:", response.data);
            throw new functions.https.HttpsError('internal', 'Could not retrieve access token from Powens.');
        }

    } catch (error) {
        console.error("Error getting Powens access token:", error);
        if (axios.isAxiosError(error) && error.response) {
            console.error("Powens API response:", error.response.data);
            throw new functions.https.HttpsError(
                'internal',
                'Failed to communicate with Powens API.',
                error.response.data
            );
        }
        throw new functions.https.HttpsError('internal', 'An unknown error occurred while fetching the token.');
    }
});
