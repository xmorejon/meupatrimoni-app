import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import { URLSearchParams } from "url";

admin.initializeApp();
const db = admin.firestore();

const secrets = ["TRUELAYER_CLIENT_ID", "TRUELAYER_CLIENT_SECRET"];

// Define a regional function builder
const regionalFunctions = functions.region("europe-west1");

const truelayerAuthBaseUrl = 'https://auth.truelayer.com';
const truelayerApiBaseUrl = 'https://api.truelayer.com';
const redirectUri = "https://meupatrimoni-app.web.app/callback.html";

export const getTrueLayerAuthLink = regionalFunctions
    .runWith({ secrets })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }
        
        const clientId = process.env.TRUELAYER_CLIENT_ID;
        if (!clientId) {
            throw new functions.https.HttpsError('internal', 'Server configuration error: missing TrueLayer Client ID.');
        }

        const authUrl = new URL(`${truelayerAuthBaseUrl}/`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('scope', 'info accounts balance cards transactions direct_debits standing_orders offline_access');
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('providers', 'uk-oauth-all es-ob-revolut es-xs2a-santander es-xs2a-ing');

        functions.logger.info("Generated TrueLayer Auth URL:", authUrl.toString());

        return { authUrl: authUrl.toString() };
    });

export const handleTrueLayerCallback = regionalFunctions
    .runWith({ secrets })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }
        if (!data.code) {
            throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "code".');
        }

        functions.logger.info("handleTrueLayerCallback received code:", data.code);

        const uid = context.auth.uid;
        const clientId = process.env.TRUELAYER_CLIENT_ID;
        const clientSecret = process.env.TRUELAYER_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
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
            
            functions.logger.info("TrueLayer token exchange successful. Status:", tokenResponse.status);

            const userAccessToken = tokenResponse.data.access_token;
            if (!userAccessToken) {
                throw new functions.https.HttpsError('internal', 'Could not retrieve user access token from TrueLayer.');
            }

            const accountsResponse = await axios.get(`${truelayerApiBaseUrl}/data/v1/accounts`, {
                headers: { 'Authorization': `Bearer ${userAccessToken}` },
            });

            const accounts = accountsResponse.data.results;
            functions.logger.info(`Fetched ${accounts.length} raw accounts from TrueLayer.`, { accounts });

            const batch = db.batch();
            const newlyImportedAccountsForClient = [];

            for (const account of accounts) {
                if (account.account_type === 'TRANSACTION' || account.account_type === 'SAVING') {
                    const bankRef = db.collection('users').doc(uid).collection('banks').doc(account.account_id);
                    const bankDataForDb = {
                        id: account.account_id,
                        name: account.display_name,
                        type: account.account_type.toLowerCase(),
                        currency: account.currency,
                        // Use nullish coalescing operator to provide null if the value is undefined
                        iban: account.account_number?.iban ?? null,
                        number: account.account_number?.number ?? null,
                        institution: account.provider.display_name,
                        logo: account.provider.logo_uri,
                        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                    };
                    batch.set(bankRef, bankDataForDb, { merge: true });
                    newlyImportedAccountsForClient.push({ 
                        ...bankDataForDb, 
                        lastUpdated: new Date().toISOString(), // Use a simple timestamp for the client
                        importType: 'Bank'
                    });

                } else if (account.account_type === 'CREDIT_CARD') {
                    const debtRef = db.collection('users').doc(uid).collection('debts').doc(account.account_id);
                    const debtDataForDb = {
                        id: account.account_id,
                        name: account.display_name,
                        type: 'credit_card',
                        currency: account.currency,
                        institution: account.provider.display_name,
                        logo: account.provider.logo_uri,
                        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                    };
                    batch.set(debtRef, debtDataForDb, { merge: true });
                    newlyImportedAccountsForClient.push({ 
                        ...debtDataForDb,
                        lastUpdated: new Date().toISOString(), // Use a simple timestamp for the client
                        importType: 'Debt' 
                    });
                }
            }

            await batch.commit();
            functions.logger.info(`Successfully committed ${newlyImportedAccountsForClient.length} accounts to Firestore and returning to client.`, { newlyImportedAccountsForClient });

            return { success: true, message: `Successfully imported ${newlyImportedAccountsForClient.length} accounts.`, accounts: newlyImportedAccountsForClient };

        } catch (error) {
            functions.logger.error("Error during TrueLayer callback process:", error);
            if (axios.isAxiosError(error) && error.response) {
                functions.logger.error("TrueLayer API error response:", JSON.stringify(error.response.data));
                throw new functions.https.HttpsError('internal', 'Failed to communicate with TrueLayer API.', error.response.data);
            }
            throw new functions.https.HttpsError('internal', 'An unknown error occurred.', { message: (error as Error).message });
        }
    });
