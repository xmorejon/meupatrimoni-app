import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { google } from "googleapis";

// Ensure admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configuration
interface BankRule {
  debtId: string;
  query: string;
  amountRegex: RegExp;
}

const BANK_RULES: BankRule[] = [
  {
    debtId: "1767359789602", // Replace with the ID of the debt document for card 4830
    query:
      'from:SantanderInforma@emailing.bancosantander-mail.es is:unread "4830"',
    amountRegex: /pagament de\s+(\d+[.,]\d{2})\s+EUR/i,
  },
];

/**
 * Shared logic to check Gmail for bank emails.
 */
async function processBankEmails() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Gmail OAuth secrets.");
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth });

  let importedCount = 0;

  try {
    for (const rule of BANK_RULES) {
      // 1. Search for unread emails using the rule's query
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        q: rule.query,
        maxResults: 10,
      });

      const messages = listResponse.data.messages;

      if (!messages || messages.length === 0) {
        console.log(`No new emails found for rule: ${rule.debtId}`);
        continue;
      }

      console.log(
        `Found ${messages.length} new emails for rule: ${rule.debtId}`
      );

      for (const msg of messages) {
        if (!msg.id) continue;

        // 2. Fetch email details
        const messageResponse = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "full",
        });

        const payload = messageResponse.data.payload;
        if (!payload) continue;

        const subjectHeader = payload.headers?.find(
          (h) => h.name === "Subject"
        );
        const subject = subjectHeader ? subjectHeader.value : "No Subject";
        const snippet = messageResponse.data.snippet || "";

        console.log(`Processing: ${subject}`);

        // 3. Parse Transaction Data using the rule's regex
        const match = snippet.match(rule.amountRegex);

        if (match) {
          const amountString = match[1].replace(",", ".");
          const expenseAmount = parseFloat(amountString);
          const description = `Imported: ${subject}`;

          // 4. Differential Update
          await db.runTransaction(async (transaction) => {
            const lastEntryQuery = db
              .collection("debtEntries")
              .where("debtId", "==", rule.debtId)
              .orderBy("timestamp", "desc")
              .limit(1);

            const lastEntrySnapshot = await transaction.get(lastEntryQuery);

            let currentBalance = 0;
            if (!lastEntrySnapshot.empty) {
              currentBalance = lastEntrySnapshot.docs[0].data().value;
            }

            const newBalance = currentBalance + expenseAmount;
            const timestamp = admin.firestore.Timestamp.now();

            const newEntryRef = db.collection("debtEntries").doc();
            transaction.set(newEntryRef, {
              debtId: rule.debtId,
              value: newBalance,
              timestamp: timestamp,
              isAutoImport: true,
            });

            const transactionRef = db.collection("transactions").doc();
            transaction.set(transactionRef, {
              debtId: rule.debtId,
              amount: expenseAmount,
              description: description,
              date: timestamp,
              rawEmailText: snippet,
            });
          });
          console.log(`Imported transaction: ${expenseAmount}`);
          importedCount++;
        } else {
          console.log(`Skipped: Regex did not match for ${msg.id}`);
        }

        // 5. Mark as Read
        await gmail.users.messages.modify({
          userId: "me",
          id: msg.id,
          requestBody: {
            removeLabelIds: ["UNREAD"],
          },
        });
      }
    }

    if (importedCount === 0) {
      return { success: true, count: 0, message: "No new bank emails found." };
    }
    console.log(`Imported ${importedCount} transactions.`);
    return {
      success: true,
      count: importedCount,
      message: `Imported ${importedCount} transactions.`,
    };
  } catch (error: any) {
    console.error("Error processing Gmail:", error);
    if (error.message?.includes("Gmail API has not been used")) {
      throw new HttpsError(
        "failed-precondition",
        "Gmail API is not enabled. Please enable it in the Google Cloud Console."
      );
    }
    throw error;
  }
}

/**
 * Scheduled function: Runs every 4 hours automatically.
 */
export const checkBankEmailsScheduled = onSchedule(
  {
    region: "europe-west1",
    schedule: "every 4 hours",
    secrets: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"],
  },
  async (event) => {
    await processBankEmails();
  }
);

/**
 * Callable function: Triggered manually by the "Act. Comptes" button.
 */
export const checkBankEmails = onCall(
  {
    region: "europe-west1",
    cors: true,
    secrets: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    try {
      return await processBankEmails();
    } catch (error) {
      throw new HttpsError(
        "internal",
        "Error processing Gmail emails.",
        error as any
      );
    }
  }
);
