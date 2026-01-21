import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import { startOfDay, endOfDay } from "date-fns";

// Ensure admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configuration
interface BankRule {
  cardIdentifier: string;
  query: string;
  amountRegex: RegExp;
  merchantRegex: RegExp;
  operation: string;
}

const BANK_RULES: BankRule[] = [
  {
    cardIdentifier: "4830",
    query:
      'from:SantanderInforma@emailing.bancosantander-mail.es is:unread "4830" subject:"Compres" -subject:"petició"',
    amountRegex: /pagament de\s+(\d+[.,]\d{2})\s+EUR/i,
    merchantRegex: /4830\s+en\s+([^.]+)/i,
    operation: "Compres",
  },
  {
    cardIdentifier: "4830",
    query:
      'from:SantanderInforma@emailing.bancosantander-mail.es is:unread "4830" subject:"Compres (petició d\'autorització)"',
    amountRegex: /retenció de\s+(\d+[.,]\d{2})\s+EUR/i,
    merchantRegex: /per part de\s+(.+?)\s+amb la targeta/i,
    operation: "Online",
  },
];

function getEmailBody(payload: any): string {
  if (!payload) return "";

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(
          part.body.data.replace(/-/g, "+").replace(/_/g, "/"),
          "base64",
        ).toString("utf-8");
      }
      if (part.parts) {
        const body = getEmailBody(part);
        if (body) return body;
      }
    }
  }
  if (payload.body?.data) {
    return Buffer.from(
      payload.body.data.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf-8");
  }
  return "";
}

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

  // Fetch all debts to link cards dynamically
  const debtsSnapshot = await db.collection("debts").get();

  try {
    for (const rule of BANK_RULES) {
      // Find the debt where name contains the identifier
      const debtDoc = debtsSnapshot.docs.find((doc) => {
        const data = doc.data();
        return data.name && data.name.includes(rule.cardIdentifier);
      });

      if (!debtDoc) {
        console.log(
          `No debt found with name containing "${rule.cardIdentifier}". Skipping rule.`,
        );
        continue;
      }
      const debtId = debtDoc.id;
      const debtData = debtDoc.data();
      const debtName = debtData.name;
      const debtType = debtData.type || "Credit Card";

      // 1. Search for unread emails using the rule's query
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        q: rule.query,
        maxResults: 10,
      });

      const messages = listResponse.data.messages;

      if (!messages || messages.length === 0) {
        console.log(`No new emails found for rule: ${rule.cardIdentifier}`);
        continue;
      }

      console.log(
        `Found ${messages.length} new emails for rule: ${rule.cardIdentifier}`,
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

        const internalDateStr = messageResponse.data.internalDate;
        const emailDate = internalDateStr
          ? new Date(parseInt(internalDateStr, 10))
          : new Date();
        const emailIsoString = emailDate.toISOString();

        const subjectHeader = payload.headers?.find(
          (h) => h.name === "Subject",
        );
        const subject = subjectHeader ? subjectHeader.value : "No Subject";
        const snippet = messageResponse.data.snippet || "";
        const fullBody = getEmailBody(payload);
        const textToSearch = fullBody || snippet;

        console.log(`Processing: ${subject}`);

        // 3. Parse Transaction Data using the rule's regex
        const match = textToSearch.match(rule.amountRegex);

        if (match) {
          const amountString = match[1].replace(",", ".");
          const expenseAmount = parseFloat(amountString);

          let merchant = "";
          const merchantMatch = textToSearch.match(rule.merchantRegex);
          if (merchantMatch && merchantMatch[1]) {
            merchant = merchantMatch[1].trim();
          } else {
            console.log(
              `Merchant regex failed. Text length: ${textToSearch.length}. Snippet: "${snippet}"`,
            );
          }

          const description = merchant
            ? `${rule.operation}: ${merchant}`
            : `Imported: ${rule.operation}`;

          // 4. Differential Update
          const wasImported = await db.runTransaction(async (transaction) => {
            const debtRef = db.collection("debts").doc(debtId);
            const movementsRef = db.collection("debtMovements").doc(debtId);
            const timestamp = admin.firestore.Timestamp.now();

            // READS: Must be performed before any writes
            const debtSnapshot = await transaction.get(debtRef);
            const movementsDoc = await transaction.get(movementsRef);

            // Check for existing entry for today
            const start = startOfDay(timestamp.toDate());
            const end = endOfDay(timestamp.toDate());
            const entryQuery = db
              .collection("debtEntries")
              .where("debtId", "==", debtId)
              .where("timestamp", ">=", start)
              .where("timestamp", "<=", end)
              .limit(1);
            const entrySnapshot = await transaction.get(entryQuery);

            if (!debtSnapshot.exists) {
              throw new Error(`Debt document ${debtId} does not exist.`);
            }

            let movements = [];
            if (movementsDoc.exists) {
              movements = movementsDoc.data()?.movements || [];
            }

            // Avoid duplicates: Check if transaction_id already exists
            const existingIndex = movements.findIndex(
              (m: any) => m.transaction_id === `email-${msg.id}`,
            );

            if (existingIndex !== -1) {
              return false; // Skip this transaction
            }

            const currentBalance = debtSnapshot.data()?.balance || 0;
            const newBalance =
              Math.round((currentBalance + expenseAmount) * 100) / 100;

            const newMovement = {
              transaction_id: `email-${msg.id}`,
              amount: -expenseAmount, // Negative to indicate spending
              currency: "EUR",
              description: description,
              timestamp: emailIsoString,
              transaction_type: "CREDIT",
              meta: {
                transaction_type: "CREDIT",
                timestamp: emailIsoString,
                transaction_category: "PURCHASE",
              },
            };

            // WRITES
            // 1) Update the balance in the debts collection
            transaction.update(debtRef, {
              balance: newBalance,
              lastUpdated: timestamp,
            });

            // 2) Upsert an entry in the debtEntries collection
            let newEntryRef;
            if (!entrySnapshot.empty) {
              newEntryRef = entrySnapshot.docs[0].ref;
            } else {
              newEntryRef = db.collection("debtEntries").doc();
            }
            transaction.set(newEntryRef, {
              debtId: debtId,
              balance: newBalance,
              name: debtName,
              type: debtType,
              timestamp: timestamp,
              isAutoImport: true,
            });

            // 3) Update debtMovements with last 20 transactions
            movements.push(newMovement);
            // Sort descending by timestamp
            movements.sort(
              (a: any, b: any) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            );
            // Limit to 20
            if (movements.length > 20) {
              movements = movements.slice(0, 20);
            }

            transaction.set(
              movementsRef,
              {
                debtId: debtId,
                movements: movements,
                lastUpdated: timestamp,
              },
              { merge: true },
            );
            return true;
          });

          if (wasImported) {
            console.log(`Imported transaction: ${expenseAmount}`);
            importedCount++;
          }
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
        "Gmail API is not enabled. Please enable it in the Google Cloud Console.",
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
  },
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
        "The function must be called while authenticated.",
      );
    }
    try {
      return await processBankEmails();
    } catch (error) {
      throw new HttpsError(
        "internal",
        "Error processing Gmail emails.",
        error as any,
      );
    }
  },
);
