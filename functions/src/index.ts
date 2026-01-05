import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import { URLSearchParams } from "url";

admin.initializeApp();
const db = admin.firestore();

// Define the secrets we need for the functions
const secrets = ["POWENS_CLIENT_ID", "POWENS_CLIENT_SECRET"];
// Corrected Powens sandbox API URL from your developer dashboard
const powensApiBaseUrl = 'https://canmore-sandbox.biapi.pro/2.0';

/**
 * A callable function to get a temporary client_credentials access token.
 * This is used by the frontend to initialize the Powens Connect UI.
 */
export const getPowensAccessToken = functions
    .region("europe-west1")
    .runWith({ secrets })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }

        const clientId = process.env.POWENS_CLIENT_ID;
        const clientSecret = process.env.POWENS_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new functions.https.HttpsError('internal', 'Server configuration error: missing secrets.');
        }

        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', clientId);
            params.append('client_secret', clientSecret);

            // Corrected the endpoint to /auth/token
            const response = await axios.post(`${powensApiBaseUrl}/auth/token`, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

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
                throw new functions.https.HttpsError('internal', 'Failed to communicate with Powens API.', error.response.data);
            }
            throw new functions.https.HttpsError('internal', 'An unknown error occurred while fetching the token.');
        }
    });

/**
 * Exchanges a Powens authorization_code for a permanent user token,
 * fetches the user's accounts, and saves them to Firestore.
 */
export const exchangeAuthorizationCodeAndFetchAccounts = functions
    .region("europe-west1")
    .runWith({ secrets })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }
        if (!data.authorizationCode || !data.redirectUri) {
            throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an "authorizationCode" and "redirectUri".');
        }

        const uid = context.auth.uid;
        const clientId = process.env.POWENS_CLIENT_ID;
        const clientSecret = process.env.POWENS_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new functions.https.HttpsError('internal', 'Server configuration error: missing secrets.');
        }

        try {
            const tokenParams = new URLSearchParams();
            tokenParams.append('grant_type', 'authorization_code');
            tokenParams.append('code', data.authorizationCode);
            tokenParams.append('client_id', clientId);
            tokenParams.append('client_secret', clientSecret);
            tokenParams.append('redirect_uri', data.redirectUri);

            // Corrected the endpoint to /auth/token
            const tokenResponse = await axios.post(`${powensApiBaseUrl}/auth/token`, tokenParams, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            const userAccessToken = tokenResponse.data.access_token;
            if (!userAccessToken) {
                throw new functions.https.HttpsError('internal', 'Could not retrieve user access token from Powens.');
            }
            
            const accountsResponse = await axios.get(`${powensApiBaseUrl}/accounts`, {
                headers: { 'Authorization': `Bearer ${userAccessToken}` },
            });

            const accounts = accountsResponse.data.accounts;
            const batch = db.batch();
            let importedCount = 0;

            for (const account of accounts) {
                const bankRef = db.collection('users').doc(uid).collection('banks').doc(account.id);
                
                batch.set(bankRef, {
                    id: account.id,
                    name: account.name,
                    type: account.type,
                    currency: account.currency.id,
                    iban: account.iban,
                    number: account.number,
                    institution: account.connection.connector.name,
                    logo: account.connection.connector.logo,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                const balanceEntryRef = bankRef.collection('balanceEntries').doc();
                batch.set(balanceEntryRef, {
                    date: admin.firestore.Timestamp.fromDate(new Date(account.balance_date)),
                    balance: account.balance,
                });
                importedCount++;
            }

            await batch.commit();

            return { success: true, message: `Successfully imported ${importedCount} accounts.` };

        } catch (error) {
            console.error("Error exchanging authorization code or fetching accounts:", error);
            if (axios.isAxiosError(error) && error.response) {
                console.error("Powens API response:", error.response.data);
                throw new functions.https.HttpsError('internal', 'Failed to communicate with Powens API.', error.response.data);
            }
            throw new functions.https.HttpsError('internal', 'An unknown error occurred.');
        }
    });