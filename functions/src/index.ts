import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import { URLSearchParams } from "url";
import { startOfDay, endOfDay } from "date-fns";

admin.initializeApp();
const db = admin.firestore();

const secrets = ["TRUELAYER_CLIENT_ID", "TRUELAYER_CLIENT_SECRET"];

const regionalFunctions = functions.region("europe-west1");

const truelayerAuthBaseUrl = "https://auth.truelayer.com";
const truelayerApiBaseUrl = "https://api.truelayer.com";
const redirectUri = "https://meupatrimoni-app.web.app/callback.html";

const mapAccountType = (truelayerType: string): string => {
  const type = truelayerType.toUpperCase();
  switch (type) {
    case "TRANSACTION":
    case "SAVING":
      return "Current Account";
    case "CREDIT_CARD":
      return "Credit Card";
    default:
      return "Other";
  }
};

async function getOrCreateEntry(
  collectionName: string,
  itemIdField: string,
  itemId: string,
  timestamp: admin.firestore.Timestamp
) {
  const start = startOfDay(timestamp.toDate());
  const end = endOfDay(timestamp.toDate());
  const q = db
    .collection(collectionName)
    .where(itemIdField, "==", itemId)
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end);
  const querySnapshot = await q.get();
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].ref;
  } else {
    return db.collection(collectionName).doc();
  }
}

export const getTrueLayerAuthLink = regionalFunctions
  .runWith({ secrets })
  .https.onCall(async (data, context) => {
    const clientId = process.env.TRUELAYER_CLIENT_ID;
    if (!clientId) {
      throw new functions.https.HttpsError(
        "internal",
        "Server configuration error: missing secrets."
      );
    }

    const authUrl = new URL(`${truelayerAuthBaseUrl}/`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set(
      "scope",
      "info accounts balance cards transactions direct_debits standing_orders offline_access"
    );
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set(
      "providers",
      "es-ob-revolut es-xs2a-santander es-xs2a-ing"
    );
    functions.logger.info("Generated TrueLayer Auth URL:", authUrl.toString());
    return { authUrl: authUrl.toString() };
  });

export const handleTrueLayerCallback = regionalFunctions
  .runWith({ secrets })
  .https.onCall(async (data, context) => {
    if (!data.code) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        'The function must be called with a "code".'
      );
    }

    const clientId = process.env.TRUELAYER_CLIENT_ID;
    const clientSecret = process.env.TRUELAYER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new functions.https.HttpsError(
        "internal",
        "Server configuration error: missing secrets."
      );
    }

    try {
      const tokenParams = new URLSearchParams();
      tokenParams.append("grant_type", "authorization_code");
      tokenParams.append("client_id", clientId);
      tokenParams.append("client_secret", clientSecret);
      tokenParams.append("redirect_uri", redirectUri);
      tokenParams.append("code", data.code);

      const tokenResponse = await axios.post(
        `${truelayerAuthBaseUrl}/connect/token`,
        tokenParams,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      if (!access_token) {
        throw new functions.https.HttpsError(
          "internal",
          "Could not retrieve user access token from TrueLayer."
        );
      }

      const accountsResponse = await axios.get(
        `${truelayerApiBaseUrl}/data/v1/accounts`,
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      const accounts = accountsResponse.data.results;
      functions.logger.info(
        `Fetched ${accounts.length} raw accounts from TrueLayer.`
      );

      const batch = db.batch();
      const newlyImportedAccountsForClient = [];
      const now = admin.firestore.Timestamp.now();

      for (const account of accounts) {
        let balance = null;
        try {
          const balanceResponse = await axios.get(
            `${truelayerApiBaseUrl}/data/v1/accounts/${account.account_id}/balance`,
            {
              headers: { Authorization: `Bearer ${access_token}` },
            }
          );
          if (
            balanceResponse.data.results &&
            balanceResponse.data.results.length > 0
          ) {
            balance = balanceResponse.data.results[0].current;
          }
        } catch (balanceError) {
          functions.logger.warn(
            `Could not fetch balance for account ${account.account_id}.`,
            balanceError
          );
        }

        if (balance === null) {
          continue; // Skip accounts where balance couldn't be fetched
        }

        const tokenExpiresAt = admin.firestore.Timestamp.fromMillis(
          now.toMillis() + expires_in * 1000
        );

        if (
          account.account_type === "TRANSACTION" ||
          account.account_type === "SAVING"
        ) {
          const bankRef = db.collection("banks").doc(account.account_id);
          const doc = await bankRef.get();
          const existingName = doc.exists ? doc.data()?.name : null;
          const bankName = existingName || account.display_name;

          const bankData = {
            id: account.account_id,
            name: bankName,
            type: mapAccountType(account.account_type),
            currency: account.currency,
            iban: account.account_number?.iban ?? null,
            number: account.account_number?.number ?? null,
            institution: account.provider.display_name,
            providerId: account.provider.provider_id, // Persist the provider_id
            balance: balance,
            lastUpdated: now,
            truelayerId: account.account_id, // Explicitly set truelayerId
            truelayer: {
              accessToken: access_token,
              refreshToken: refresh_token,
              tokenExpiresAt: tokenExpiresAt,
            },
          };
          batch.set(bankRef, bankData, { merge: true });

          const balanceEntryRef = await getOrCreateEntry(
            "balanceEntries",
            "bankId",
            bankRef.id,
            now
          );
          batch.set(
            balanceEntryRef,
            {
              balance: balance,
              timestamp: now,
              bankId: bankRef.id,
              bank: bankName,
            },
            { merge: true }
          );

          newlyImportedAccountsForClient.push({
            ...bankData,
            lastUpdated: new Date().toISOString(),
            importType: "Bank",
          });
        } else if (account.account_type === "CREDIT_CARD") {
          const debtRef = db.collection("debts").doc(account.account_id);
          const doc = await debtRef.get();
          const existingName = doc.exists ? doc.data()?.name : null;
          const debtName = existingName || account.display_name;

          const debtData = {
            id: account.account_id,
            name: debtName,
            type: "Credit Card", // Corrected type
            currency: account.currency,
            institution: account.provider.display_name,
            providerId: account.provider.provider_id, // Persist the provider_id
            balance: balance,
            lastUpdated: now,
            truelayerId: account.account_id, // Explicitly set truelayerId
            truelayer: {
              // Added truelayer token info for future use
              accessToken: access_token,
              refreshToken: refresh_token,
              tokenExpiresAt: tokenExpiresAt,
            },
          };
          batch.set(debtRef, debtData, { merge: true });

          const debtEntryRef = await getOrCreateEntry(
            "debtEntries",
            "debtId",
            debtRef.id,
            now
          );
          batch.set(
            debtEntryRef,
            {
              balance: balance,
              timestamp: now,
              debtId: debtRef.id,
              debtName: debtName,
            },
            { merge: true }
          );

          newlyImportedAccountsForClient.push({
            ...debtData,
            lastUpdated: new Date().toISOString(),
            importType: "Debt",
          });
        }
      }

      await batch.commit();
      functions.logger.info(
        `Successfully committed ${newlyImportedAccountsForClient.length} accounts to Firestore.`
      );

      return {
        success: true,
        message: `Successfully imported ${newlyImportedAccountsForClient.length} accounts.`,
        accounts: newlyImportedAccountsForClient,
      };
    } catch (error) {
      functions.logger.error("Error during TrueLayer callback process:", error);
      if (axios.isAxiosError(error) && error.response) {
        functions.logger.error(
          "TrueLayer API error response:",
          JSON.stringify(error.response.data)
        );
        throw new functions.https.HttpsError(
          "internal",
          "Failed to communicate with TrueLayer API.",
          error.response.data
        );
      }
      throw new functions.https.HttpsError(
        "internal",
        "An unknown error occurred.",
        { message: (error as Error).message }
      );
    }
  });

export const refreshTruelayerData = regionalFunctions
  .runWith({ secrets })
  .https.onCall(async (data, context) => {
    const clientId = process.env.TRUELAYER_CLIENT_ID;
    const clientSecret = process.env.TRUELAYER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new functions.https.HttpsError(
        "internal",
        "Server configuration error: missing secrets."
      );
    }

    const banksSnapshot = await db
      .collection("banks")
      .where("truelayer", "!=", null)
      .get();
    const debtsSnapshot = await db
      .collection("debts")
      .where("truelayer", "!=", null)
      .get();
    const allAccounts = [...banksSnapshot.docs, ...debtsSnapshot.docs];

    if (allAccounts.length === 0) {
      return {
        success: true,
        message: "No hi ha comptes automàtics per refrescar.",
      };
    }

    const batch = db.batch();
    let refreshedAccounts = 0;

    for (const doc of allAccounts) {
      const account = doc.data();
      let { accessToken, refreshToken, tokenExpiresAt } = account.truelayer;

      if (tokenExpiresAt.toMillis() < Date.now()) {
        functions.logger.info(
          `Token for ${account.name} is expired. Refreshing...`
        );
        const tokenParams = new URLSearchParams();
        tokenParams.append("grant_type", "refresh_token");
        tokenParams.append("client_id", clientId);
        tokenParams.append("client_secret", clientSecret);
        tokenParams.append("refresh_token", refreshToken);

        try {
          const tokenResponse = await axios.post(
            `${truelayerAuthBaseUrl}/connect/token`,
            tokenParams,
            {
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
          );
          accessToken = tokenResponse.data.access_token;
          refreshToken = tokenResponse.data.refresh_token;
          tokenExpiresAt = admin.firestore.Timestamp.fromMillis(
            Date.now() + tokenResponse.data.expires_in * 1000
          );

          batch.update(doc.ref, {
            "truelayer.accessToken": accessToken,
            "truelayer.refreshToken": refreshToken,
            "truelayer.tokenExpiresAt": tokenExpiresAt,
          });
        } catch (error) {
          functions.logger.error(
            `Error al refrescar el token per a ${account.name}:`,
            error
          );
          continue; // Skip to the next account
        }
      }

      try {
        const balanceResponse = await axios.get(
          `${truelayerApiBaseUrl}/data/v1/accounts/${account.id}/balance`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (
          balanceResponse.data.results &&
          balanceResponse.data.results.length > 0
        ) {
          const newBalance = balanceResponse.data.results[0].current;
          const now = admin.firestore.Timestamp.now();

          batch.update(doc.ref, { balance: newBalance, lastUpdated: now });

          if (doc.ref.parent.id === "banks") {
            const balanceEntryRef = await getOrCreateEntry(
              "balanceEntries",
              "bankId",
              doc.id,
              now
            );
            batch.set(
              balanceEntryRef,
              {
                balance: newBalance,
                timestamp: now,
                bankId: doc.id,
                bank: account.name,
              },
              { merge: true }
            );
          } else if (doc.ref.parent.id === "debts") {
            const debtEntryRef = await getOrCreateEntry(
              "debtEntries",
              "debtId",
              doc.id,
              now
            );
            batch.set(
              debtEntryRef,
              {
                balance: newBalance,
                timestamp: now,
                debtId: doc.id,
                debtName: account.name,
              },
              { merge: true }
            );
          }
          refreshedAccounts++;
        }
      } catch (error) {
        functions.logger.error(
          `Error obtenint el balanç per a ${account.name}:`,
          error
        );
      }
    }

    await batch.commit();
    return {
      success: true,
      message: `Refrescades ${refreshedAccounts} entrades.`,
    };
  });

export * from "./csv";
