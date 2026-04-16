import * as admin from "firebase-admin";
import { startOfDay, endOfDay } from "date-fns";
import { db } from "./firebase";

/**
 * Finds an existing daily entry for a given item or prepares a new document reference.
 * This is used to ensure only one entry per day is created for a bank or debt account.
 * @param collectionName The name of the collection to search in (e.g., "balanceEntries").
 * @param itemIdField The field to match the item's ID against (e.g., "bankId").
 * @param itemId The ID of the item (bank or debt).
 * @param timestamp The Firestore timestamp for the operation.
 * @returns A DocumentReference for the existing or new entry.
 */
export async function getOrCreateEntry(
  collectionName: string,
  itemIdField: string,
  itemId: string,
  timestamp: admin.firestore.Timestamp,
) {
  const start = startOfDay(timestamp.toDate());
  const end = endOfDay(timestamp.toDate());
  const q = db
    .collection(collectionName)
    .where(itemIdField, "==", itemId)
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end);
  const querySnapshot = await q.get();
  return querySnapshot.empty
    ? db.collection(collectionName).doc()
    : querySnapshot.docs[0].ref;
}
