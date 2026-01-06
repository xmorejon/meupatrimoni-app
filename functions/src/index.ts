import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import { URLSearchParams } from "url";

admin.initializeApp();
const db = admin.firestore();

const secrets = ["TRUELAYER_CLIENT_SECRET"];

const truelayerAuthBaseUrl = 'https://auth.truelayer.com';
const truelayerApiBaseUrl = 'https://api.truelayer.com';
const redirectUri = "https://meupatrimoni-app.web.app";

export const getTrueLayerAuthLink = functions
    .region("europe-west1")
    .runWith({ secrets })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }
        
        // As per the new format, the client_id is static for this provider
        const clientId = "santander-e56236";

        const authUrl = new URL(`${truelayerAuthBaseUrl}/`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('scope', 'info accounts balance cards transactions direct_debits standing_orders offline_access');
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('providers', 'uk-oauth-all es-ob-revolut es-xs2a-santander es-xs2a-ing');
        authUrl.searchParams.set('disable_providers', 'uk-ob-all');

        functions.logger.info("Generated TrueLayer Auth URL:", authUrl.toString());

        return { authUrl: authUrl.toString() };
    });

export const handleTrueLayerCallback = functions
    .region("europe-west1")
    .runWith({ secrets })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }
        if (!data.code) {
            throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "code".');
        }

        const uid = context.auth.uid;
        const clientId = "santander-e56236"; // Use the static client_id
        const clientSecret = process.env.TRUELAYER_CLIENT_SECRET;

        if (!clientSecret) {
            throw new functions.https.HttpsError('internal', 'Server configuration error: missing secrets.');
        }

        try {
            const tokenParams = new URLSearchParams();
            tokenParams.append('grant_type', 'authorization_code');
            tokenParams.append('client_id', clientId);
            tokenParams.append('client_secret', clientSecret);
            tokenParams.append('redirect_uri', redirectUri);
            tokenParams.append('code', data.code);

            const tokenResponse = await axios.post(`${truelayerAuthBaseUrl}/connect/token`, tokenParams, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            const userAccessToken = tokenResponse.data.access_token;
            if (!userAccessToken) {
                throw new functions.https.HttpsError('internal', 'Could not retrieve user access token from TrueLayer.');
            }

            const accountsResponse = await axios.get(`${truelayerApiBaseUrl}/data/v1/accounts`, {
                headers: { 'Authorization': `Bearer ${userAccessToken}` },
            });

            const accounts = accountsResponse.data.results;
            const batch = db.batch();
            let importedCount = 0;

            for (const account of accounts) {
                if (account.account_type !== 'TRANSACTION') {
                    continue;
                }
                const bankRef = db.collection('users').doc(uid).collection('banks').doc(account.account_id);

                const balanceResponse = await axios.get(`${truelayerApiBaseUrl}/data/v1/accounts/${account.account_id}/balance`, {
                     headers: { 'Authorization': `Bearer ${userAccessToken}` },
                });
                const balance = balanceResponse.data.results[0];
                
                batch.set(bankRef, {
                    id: account.account_id,
                    name: account.display_name,
                    type: account.account_type.toLowerCase(),
                    currency: account.currency,
                    iban: account.account_number?.iban,
                    number: account.account_number?.number,
                    institution: account.provider.display_name,
                    logo: account.provider.logo_uri,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                const balanceEntryRef = bankRef.collection('balanceEntries').doc();
                batch.set(balanceEntryRef, {
                    date: admin.firestore.Timestamp.fromDate(new Date(balance.update_timestamp)),
                    balance: balance.current,
                });
                importedCount++;
            }

            await batch.commit();

            return { success: true, message: `Successfully imported ${importedCount} accounts.` };

        } catch (error) {
            console.error("Error during TrueLayer callback process:", error);
            if (axios.isAxiosError(error) && error.response) {
                console.error("TrueLayer API response:", JSON.stringify(error.response.data));
                throw new functions.https.HttpsError('internal', 'Failed to communicate with TrueLayer API.', error.response.data);
            }
            throw new functions.https.HttpsError('internal', 'An unknown error occurred.');
        }
    });
