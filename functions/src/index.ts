import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import { URLSearchParams } from "url";

admin.initializeApp();
const db = admin.firestore();

const secrets = ["TRUELAYER_CLIENT_ID", "TRUELAYER_CLIENT_SECRET"];

const regionalFunctions = functions.region("europe-west1");

const truelayerAuthBaseUrl = 'https://auth.truelayer.com';
const truelayerApiBaseUrl = 'https://api.truelayer.com';
const redirectUri = "https://meupatrimoni-app.web.app/callback.html";

const mapAccountType = (truelayerType: string): string => {
    const type = truelayerType.toUpperCase();
    switch (type) {
        case 'TRANSACTION':
        case 'SAVING':
            return 'Current Account';
        case 'CREDIT_CARD':
            return 'Credit Card';
        default:
            return 'Other';
    }
}

export const getTrueLayerAuthLink = regionalFunctions
    .runWith({ secrets })
    .https.onCall(async (data, context) => {
        const clientId = process.env.TRUELAYER_CLIENT_ID;
        if (!clientId) {
            throw new functions.https.HttpsError('internal', 'Server configuration error: missing secrets.');
        }

        const authUrl = new URL(`${truelayerAuthBaseUrl}/`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('scope', 'info accounts balance cards transactions direct_debits standing_orders offline_access');
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('providers', 'es-ob-revolut es-xs2a-santander es-xs2a-ing');
        functions.logger.info("Generated TrueLayer Auth URL:", authUrl.toString());
        return { authUrl: authUrl.toString() };
    });

export const handleTrueLayerCallback = regionalFunctions
    .runWith({ secrets })
    .https.onCall(async (data, context) => {
        if (!data.code) {
            throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "code".');
        }

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
            
            const userAccessToken = tokenResponse.data.access_token;
            if (!userAccessToken) {
                throw new functions.https.HttpsError('internal', 'Could not retrieve user access token from TrueLayer.');
            }

            const accountsResponse = await axios.get(`${truelayerApiBaseUrl}/data/v1/accounts`, {
                headers: { 'Authorization': `Bearer ${userAccessToken}` },
            });

            const accounts = accountsResponse.data.results;
            functions.logger.info(`Fetched ${accounts.length} raw accounts from TrueLayer.`);

            const batch = db.batch();
            const newlyImportedAccountsForClient = [];
            const now = admin.firestore.Timestamp.now();

            for (const account of accounts) {
                let balance = null;
                try {
                    const balanceResponse = await axios.get(`${truelayerApiBaseUrl}/data/v1/accounts/${account.account_id}/balance`, {
                        headers: { 'Authorization': `Bearer ${userAccessToken}` },
                    });
                    if (balanceResponse.data.results && balanceResponse.data.results.length > 0) {
                        balance = balanceResponse.data.results[0].current;
                    }
                } catch (balanceError) {
                    functions.logger.warn(`Could not fetch balance for account ${account.account_id}.`, balanceError);
                }

                if (balance === null) {
                    continue; // Skip accounts where balance couldn't be fetched
                }

                if (account.account_type === 'TRANSACTION' || account.account_type === 'SAVING') {
                    const bankRef = db.collection('banks').doc(account.account_id);
                    const doc = await bankRef.get();
                    const existingName = doc.exists ? doc.data()?.name : null;
                    const bankName = existingName || account.display_name;

                    // Set the main bank document (create or update)
                    const bankData = {
                        id: account.account_id,
                        name: bankName,
                        type: mapAccountType(account.account_type),
                        currency: account.currency,
                        iban: account.account_number?.iban ?? null,
                        number: account.account_number?.number ?? null,
                        institution: account.provider.display_name,
                        logo: account.provider.logo_uri,
                        balance: balance,
                        lastUpdated: now
                    };
                    batch.set(bankRef, bankData, { merge: true });

                    // Add the linked balance entry
                    const balanceEntryRef = db.collection('balanceEntries').doc();
                    batch.set(balanceEntryRef, {
                        balance: balance,
                        timestamp: now,
                        bankId: bankRef.id,
                        bank: bankName 
                    });

                    newlyImportedAccountsForClient.push({ ...bankData, lastUpdated: new Date().toISOString(), importType: 'Bank' });

                } else if (account.account_type === 'CREDIT_CARD') {
                    const debtRef = db.collection('debts').doc(account.account_id);
                    const doc = await debtRef.get();
                    const existingName = doc.exists ? doc.data()?.name : null;
                    const debtName = existingName || account.display_name;

                    // Set the main debt document
                    const debtData = {
                        id: account.account_id,
                        name: debtName,
                        type: 'credit_card',
                        currency: account.currency,
                        institution: account.provider.display_name,
                        logo: account.provider.logo_uri,
                        balance: balance,
                        lastUpdated: now
                    };
                    batch.set(debtRef, debtData, { merge: true });

                    // Add the linked debt entry
                    const debtEntryRef = db.collection('debtEntries').doc();
                    batch.set(debtEntryRef, {
                        balance: balance,
                        timestamp: now,
                        debtId: debtRef.id,
                        debtName: debtName
                    });

                    newlyImportedAccountsForClient.push({ ...debtData, lastUpdated: new Date().toISOString(), importType: 'Debt' });
                }
            }

            await batch.commit();
            functions.logger.info(`Successfully committed ${newlyImportedAccountsForClient.length} accounts to Firestore.`);

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

export * from "./csv";
