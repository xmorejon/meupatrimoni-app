import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { parse } from "csv-parse/sync";
import cors from "cors";
import { startOfDay, endOfDay } from "date-fns";

const db = admin.firestore();
const corsHandler = cors({ origin: true });

// Helper to parse DD/MM/YYYY
const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parts = dateString.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  // new Date(year, monthIndex, day)
  const date = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10)
  );
  return isNaN(date.getTime()) ? null : date;
};

// Helper to parse numbers like '115.000,00'
const parseValue = (valueString: string): number => {
  if (typeof valueString !== "string") return valueString;
  // Remove thousand separators (.) and replace decimal comma (,) with a dot (.)
  const cleanedString = valueString.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleanedString);
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

export const importCsv = functions
  .region("europe-west1")
  .https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const { authorization } = req.headers;
      if (!authorization || !authorization.startsWith("Bearer ")) {
        res.status(401).send("Unauthorized");
        return;
      }

      const token = authorization.split("Bearer ")[1];
      try {
        await admin.auth().verifyIdToken(token);
      } catch (error) {
        res.status(401).send("Unauthorized");
        return;
      }

      const { csvData, entityId, entityType } = req.body;

      if (!csvData || !entityId || !entityType) {
        res.status(400).json({
          message:
            "The function must be called with csvData, entityId, and entityType.",
        });
        return;
      }

      try {
        const records = parse(csvData, {
          columns: true,
          skip_empty_lines: true,
          delimiter: ";",
          trim: true,
          relax_column_count: true,
        });

        const collectionName = entityType.toLowerCase() + "s";
        const entityRef = db.collection(collectionName).doc(entityId);
        const entityDoc = await entityRef.get();

        if (!entityDoc.exists) {
          res
            .status(404)
            .json({ message: `${entityType} with ID ${entityId} not found.` });
          return;
        }

        const entity = { id: entityDoc.id, ...entityDoc.data() } as {
          id: string;
          name: string;
          type?: string;
        };

        const entries = records
          .map((row: any) => {
            const keys = Object.keys(row);
            const dateKey = keys.find(
              (k) =>
                k.toLowerCase() === "date" || k.toLowerCase() === "timestamp"
            );
            const valueKey = keys.find(
              (k) =>
                k.toLowerCase() === "value" || k.toLowerCase() === "balance"
            );

            if (!dateKey || !valueKey) {
              return null;
            }

            const rawDate = row[dateKey];
            const timestamp = parseDate(rawDate);

            const rawValue = row[valueKey];

            if (!timestamp || rawValue === undefined) {
              if (!timestamp) {
                console.error(
                  `Skipping row due to invalid date: '${rawDate}'`,
                  row
                );
              }
              return null;
            } else {
              console.info(`Inserting row with data: '${rawDate}'`, row);
            }

            const parsedAmount = parseValue(rawValue);

            if (entityType === "Asset") {
              return { timestamp, value: parsedAmount };
            } else {
              return { timestamp, balance: parsedAmount };
            }
          })
          .filter((e: any) => e !== null);

        if (entries.length > 0) {
          const batch = db.batch();
          const entriesCollectionName =
            entityType === "Bank"
              ? "balanceEntries"
              : entityType.toLowerCase() + "Entries";

          for (const entry of entries) {
            const entryTimestamp = admin.firestore.Timestamp.fromDate(
              entry.timestamp
            );
            const itemIdField = `${entityType.toLowerCase()}Id`;
            const entryRef = await getOrCreateEntry(
              entriesCollectionName,
              itemIdField,
              entity.id,
              entryTimestamp
            );
            const commonData = { timestamp: entryTimestamp };
            let specificData = {};

            switch (entityType) {
              case "Bank":
                specificData = {
                  bankId: entity.id,
                  bank: entity.name,
                  balance: entry.balance,
                };
                break;
              case "Debt":
                specificData = {
                  debtId: entity.id,
                  name: entity.name,
                  type: entity.type,
                  balance: entry.balance,
                };
                break;
              case "Asset":
                specificData = {
                  assetId: entity.id,
                  name: entity.name,
                  type: entity.type,
                  value: entry.value,
                };
                break;
            }

            batch.set(
              entryRef,
              { ...commonData, ...specificData },
              { merge: true }
            );
          }

          const latestEntry = entries.reduce((latest: any, current: any) =>
            current.timestamp > latest.timestamp ? current : latest
          );

          if (latestEntry) {
            const entityDoc = await entityRef.get();
            const entityData = entityDoc.data();
            const lastUpdated =
              entityData?.lastUpdated?.toDate() ?? new Date(0);

            if (latestEntry.timestamp > lastUpdated) {
              const updatePayload: {
                balance?: number;
                value?: number;
                lastUpdated: admin.firestore.Timestamp;
              } = {
                lastUpdated: admin.firestore.Timestamp.fromDate(
                  latestEntry.timestamp
                ),
              };

              if (entityType === "Asset") {
                updatePayload.value = latestEntry.value;
              } else {
                updatePayload.balance = latestEntry.balance;
              }
              batch.update(entityRef, updatePayload);
            }
          }

          await batch.commit();
        }

        res.status(200).json({
          success: true,
          message: `Successfully imported ${entries.length} entries.`,
        });
      } catch (error) {
        console.error("Error importing CSV:", error);
        res
          .status(500)
          .json({ message: "An error occurred while importing the CSV data." });
      }
    });
  });
