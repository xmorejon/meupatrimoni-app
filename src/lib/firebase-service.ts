"use client";

import {
  collection,
  getDocs,
  doc,
  writeBatch,
  query,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  Timestamp,
  orderBy,
  where,
} from "firebase/firestore";
import { db, auth } from "../firebase/config"; // Centralized Firebase imports
import type {
  Bank,
  Debt,
  Asset,
  DashboardData,
  BalanceEntry,
  Entry,
} from "./types";
import {
  subDays,
  format,
  startOfToday,
  eachDayOfInterval,
  endOfDay,
  startOfDay,
  endOfYesterday,
  isSameDay,
} from "date-fns";

// Export the imported function so other modules can use it
export { auth };

// Helper to parse DD/MM/YYYY
const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const [day, month, year] = dateString.split("/");
  // new Date(year, monthIndex, day)
  return new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10)
  );
};

// Helper to parse numbers like '115.000,00'
const parseValue = (valueString: string): number => {
  if (typeof valueString !== "string") return valueString;
  // Remove thousand separators (.) and replace decimal comma (,) with a dot (.)
  const cleanedString = valueString.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleanedString);
};

// Helper function to convert Firestore Timestamps to Dates in nested objects
const convertTimestamps = <T>(data: any): T => {
  if (data?.lastUpdated instanceof Timestamp) {
    data.lastUpdated = data.lastUpdated.toDate();
  }
  if (data?.timestamp instanceof Timestamp) {
    data.timestamp = data.timestamp.toDate();
  }
  for (const key in data) {
    if (typeof data[key] === "object" && data[key] !== null) {
      convertTimestamps(data[key]);
    }
  }
  return data as T;
};

export async function getBankBreakdown(): Promise<Bank[]> {
  const banksCol = collection(db, "banks");
  const snapshot = await getDocs(banksCol);
  return snapshot.docs.map((d) =>
    convertTimestamps<Bank>({ id: d.id, ...d.data() })
  );
}

export async function getDebtBreakdown(): Promise<Debt[]> {
  const debtsCol = collection(db, "debts");
  const snapshot = await getDocs(debtsCol);
  return snapshot.docs.map((d) =>
    convertTimestamps<Debt>({ id: d.id, ...d.data() })
  );
}

export async function getAssetBreakdown(): Promise<Asset[]> {
  const assetsCol = collection(db, "assets");
  const snapshot = await getDocs(assetsCol);
  return snapshot.docs.map((d) =>
    convertTimestamps<Asset>({ id: d.id, ...d.data() })
  );
}

async function getBalanceEntries(): Promise<BalanceEntry[]> {
  const entriesCol = collection(db, "balanceEntries");
  const q = query(entriesCol, orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) =>
    convertTimestamps<BalanceEntry>({ id: d.id, ...d.data() })
  );
}

async function getDebtEntries(): Promise<
  Array<Debt & { timestamp: Date; debtId: string }>
> {
  const entriesCol = collection(db, "debtEntries");
  const q = query(entriesCol, orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) =>
    convertTimestamps<Debt & { timestamp: Date; debtId: string }>({
      id: d.id,
      ...d.data(),
    })
  );
}

async function getAssetEntries(): Promise<
  Array<Asset & { timestamp: Date; assetId: string }>
> {
  const entriesCol = collection(db, "assetEntries");
  const q = query(entriesCol, orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) =>
    convertTimestamps<Asset & { timestamp: Date; assetId: string }>({
      id: d.id,
      ...d.data(),
    })
  );
}

export async function batchImport(
  data: any[],
  importType: "Bank" | "Debt" | "Asset",
  entityId: string
): Promise<void> {
  const collectionName = importType.toLowerCase() + "s";
  const entityRef = doc(db, collectionName, entityId);
  const entityDoc = await getDoc(entityRef);

  if (!entityDoc.exists()) {
    throw new Error(`${importType} with ID ${entityId} not found.`);
  }

  const entity = { id: entityDoc.id, ...entityDoc.data() } as Entry;

  const entries = data
    .map((row) => {
      const keys = Object.keys(row);
      const dateKey = keys.find(
        (k) => k.toLowerCase() === "date" || k.toLowerCase() === "timestamp"
      );
      const valueKey = keys.find(
        (k) => k.toLowerCase() === "value" || k.toLowerCase() === "balance"
      );

      if (!dateKey || !valueKey) {
        return null;
      }

      const rawDate = row[dateKey];
      const timestamp = parseDate(rawDate);

      const rawValue = row[valueKey];

      if (!timestamp || rawValue === undefined) {
        return null;
      }

      const parsedAmount = parseValue(rawValue);

      if (importType === "Asset") {
        return { timestamp, value: parsedAmount };
      } else {
        return { timestamp, balance: parsedAmount };
      }
    })
    .filter((e) => e !== null);

  if (entries.length > 0) {
    await batchImportEntries(importType, entity, entries as any);
  }
}

async function getOrCreateEntry(
  collectionName: string,
  idField: string,
  itemId: string,
  timestamp: Timestamp
) {
  const startOfDate = startOfDay(timestamp.toDate());
  const endOfDate = endOfDay(timestamp.toDate());
  const q = query(
    collection(db, collectionName),
    where(idField, "==", itemId),
    where("timestamp", ">=", startOfDate),
    where("timestamp", "<=", endOfDate)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].ref;
  } else {
    return doc(collection(db, collectionName));
  }
}

export async function batchImportEntries(
  entryType: "Bank" | "Debt" | "Asset",
  item: Entry,
  entries: (
    | { timestamp: Date; value: number; balance?: undefined }
    | { timestamp: Date; balance: number; value?: undefined }
  )[]
): Promise<void> {
  if (entries.length === 0) return;

  const batch = writeBatch(db);

  const collectionMap = {
    Bank: { entries: "balanceEntries", main: "banks" },
    Debt: { entries: "debtEntries", main: "debts" },
    Asset: { entries: "assetEntries", main: "assets" },
  };

  const { entries: entriesCollectionName, main: mainCollectionName } =
    collectionMap[entryType];
  const entriesRef = collection(db, entriesCollectionName);
  const itemRef = doc(db, mainCollectionName, item.id);

  entries.forEach((entry) => {
    const newEntryRef = doc(entriesRef);
    const commonData = { timestamp: Timestamp.fromDate(entry.timestamp) };
    let specificData = {};

    switch (entryType) {
      case "Bank":
        specificData = {
          bankId: item.id,
          bank: item.name,
          balance: entry.balance,
        };
        break;
      case "Debt":
        specificData = {
          debtId: item.id,
          name: item.name,
          type: (item as Debt).type,
          balance: entry.balance,
        };
        break;

      case "Asset":
        specificData = {
          assetId: item.id,
          name: item.name,
          type: (item as Asset).type,
          value: entry.value,
        };
        break;
    }

    batch.set(newEntryRef, { ...commonData, ...specificData });
  });

  const latestEntry = entries.reduce((latest, current) =>
    current.timestamp > latest.timestamp ? current : latest
  );

  const itemDoc = await getDoc(itemRef);
  const itemData = itemDoc.data();
  const lastUpdated = itemData?.lastUpdated?.toDate() ?? new Date(0);

  if (latestEntry.timestamp > lastUpdated) {
    const updatePayload: {
      balance?: number;
      value?: number;
      lastUpdated: Timestamp;
    } = {
      lastUpdated: Timestamp.fromDate(latestEntry.timestamp),
    };

    if (entryType === "Asset") {
      updatePayload.value = latestEntry.value;
    } else {
      updatePayload.balance = latestEntry.balance;
    }
    batch.update(itemRef, updatePayload);
  }

  await batch.commit();
}

export async function addOrUpdateBank(
  bankData: Partial<Bank> & { name: string; balance: number }
): Promise<void> {
  const now = Timestamp.now();
  const batch = writeBatch(db);

  const bankRef = bankData.id
    ? doc(db, "banks", bankData.id)
    : doc(collection(db, "banks"));
  const { id, ...newBankData } = bankData;

  batch.set(bankRef, { ...newBankData, lastUpdated: now }, { merge: true });

  const balanceEntryRef = await getOrCreateEntry(
    "balanceEntries",
    "bankId",
    bankRef.id,
    now
  );
  batch.set(
    balanceEntryRef,
    {
      bankId: bankRef.id,
      bank: newBankData.name,
      balance: newBankData.balance,
      timestamp: now,
    },
    { merge: true }
  );

  await batch.commit();
}

export async function addOrUpdateDebt(
  debtData: Partial<Debt> & {
    name: string;
    balance: number;
    type: Debt["type"];
  }
): Promise<void> {
  const { id, ...payload } = debtData;
  const now = Timestamp.now();

  const debtRef = id ? doc(db, "debts", id) : doc(collection(db, "debts"));

  const batch = writeBatch(db);

  batch.set(debtRef, { ...payload, lastUpdated: now }, { merge: true });

  const debtEntryRef = await getOrCreateEntry(
    "debtEntries",
    "debtId",
    debtRef.id,
    now
  );
  batch.set(
    debtEntryRef,
    {
      ...payload,
      debtId: debtRef.id,
      timestamp: now,
    },
    { merge: true }
  );

  await batch.commit();
}

export async function addOrUpdateAsset(
  assetData: Partial<Asset> & {
    name: string;
    value: number;
    type: Asset["type"];
  }
): Promise<void> {
  const { id, ...payload } = assetData;
  const now = Timestamp.now();

  const assetRef = id ? doc(db, "assets", id) : doc(collection(db, "assets"));

  const batch = writeBatch(db);

  batch.set(assetRef, { ...payload, lastUpdated: now }, { merge: true });

  const assetEntryRef = await getOrCreateEntry(
    "assetEntries",
    "assetId",
    assetRef.id,
    now
  );
  batch.set(
    assetEntryRef,
    {
      ...payload,
      assetId: assetRef.id,
      timestamp: now,
    },
    { merge: true }
  );

  await batch.commit();
}

export async function getDashboardData(): Promise<DashboardData> {
  const [
    bankBreakdown,
    debtBreakdown,
    assetBreakdown,
    balanceEntries,
    debtEntries,
    assetEntries,
  ] = await Promise.all([
    getBankBreakdown(),
    getDebtBreakdown(),
    getAssetBreakdown(),
    getBalanceEntries(),
    getDebtEntries(),
    getAssetEntries(),
  ]);

  // --- CURRENT TOTALS ---
  let financialAssets = 0;
  for (const entry of bankBreakdown) {
    financialAssets += entry.balance || 0;
  }

  let physicalAssets = 0;
  for (const asset of assetBreakdown) {
    physicalAssets += asset.value || 0;
  }

  const totalAssets = financialAssets + physicalAssets;

  let totalDebts = 0;
  for (const debt of debtBreakdown) {
    totalDebts += debt.balance || 0;
  }

  let creditCardDebt = 0;
  for (const debt of debtBreakdown) {
    if (debt.type === "Credit Card") {
      creditCardDebt += debt.balance || 0;
    }
  }

  const totalNetWorth = totalAssets - totalDebts;
  const currentCashFlow = financialAssets - creditCardDebt;

  // --- HISTORICAL CALCULATIONS ---
  const allEntries = [...balanceEntries, ...debtEntries, ...assetEntries];
  const today = startOfToday();
  const allTimestamps = allEntries
    .map((e) => (e.timestamp as Date).getTime())
    .filter((t) => !isNaN(t));

  const entryDates = new Set(
    allEntries.map((e) => format(startOfDay(e.timestamp as Date), "dd/MM/yy"))
  );

  const startDate =
    allTimestamps.length > 0
      ? startOfDay(new Date(Math.min(...allTimestamps)))
      : subDays(today, 90);

  const dateInterval = eachDayOfInterval({ start: startDate, end: today });

  const groupedBalanceEntries: Record<string, BalanceEntry[]> = {};
  for (const entry of balanceEntries) {
    const key = entry.bankId;
    if (!groupedBalanceEntries[key]) {
      groupedBalanceEntries[key] = [];
    }
    groupedBalanceEntries[key].push(entry);
  }

  const groupedDebtEntries: Record<
    string,
    (Debt & { timestamp: Date; debtId: string })[]
  > = {};
  for (const entry of debtEntries) {
    const key = entry.debtId;
    if (!groupedDebtEntries[key]) {
      groupedDebtEntries[key] = [];
    }
    groupedDebtEntries[key].push(entry);
  }

  const groupedAssetEntries: Record<
    string,
    (Asset & { timestamp: Date; assetId: string })[]
  > = {};
  for (const entry of assetEntries) {
    const key = entry.assetId;
    if (!groupedAssetEntries[key]) {
      groupedAssetEntries[key] = [];
    }
    groupedAssetEntries[key].push(entry);
  }

  for (const key in groupedBalanceEntries) {
    groupedBalanceEntries[key].sort(
      (a, b) =>
        (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime()
    );
  }
  for (const key in groupedDebtEntries) {
    groupedDebtEntries[key].sort(
      (a, b) =>
        (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime()
    );
  }
  for (const key in groupedAssetEntries) {
    groupedAssetEntries[key].sort(
      (a, b) =>
        (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime()
    );
  }

  const historicalData = dateInterval.map((date) => {
    const formattedDate = format(date, "dd/MM/yy");
    const hasChange = entryDates.has(formattedDate) || isSameDay(date, today);

    if (isSameDay(date, today)) {
      return {
        date: formattedDate,
        netWorth: totalNetWorth,
        cashFlow: currentCashFlow,
        hasChange: hasChange,
      };
    }

    const endOfDate = endOfDay(date);

    let financialAssetsAtDate = 0;
    for (const bank of bankBreakdown) {
      const bankEntries = groupedBalanceEntries[bank.id] || [];
      const latestEntry = bankEntries.find(
        (e) => (e.timestamp as Date) <= endOfDate
      );
      if (latestEntry) {
        financialAssetsAtDate += latestEntry.balance;
      }
    }

    let physicalAssetsAtDate = 0;
    for (const asset of assetBreakdown) {
      const assetEntries = groupedAssetEntries[asset.id] || [];
      const latestEntry = assetEntries.find(
        (e) => (e.timestamp as Date) <= endOfDate
      );
      if (latestEntry) {
        physicalAssetsAtDate += latestEntry.value;
      }
    }

    let debtsAtDate = 0;
    for (const debt of debtBreakdown) {
      const debtEntries = groupedDebtEntries[debt.id] || [];
      const latestEntry = debtEntries.find(
        (e) => (e.timestamp as Date) <= endOfDate
      );
      if (latestEntry) {
        debtsAtDate += latestEntry.balance;
      }
    }

    let creditCardDebtAtDate = 0;
    for (const debt of debtBreakdown) {
      if (debt.type === "Credit Card") {
        const debtEntries = groupedDebtEntries[debt.id] || [];
        const latestEntry = debtEntries.find(
          (e) => (e.timestamp as Date) <= endOfDate
        );
        if (latestEntry) {
          creditCardDebtAtDate += latestEntry.balance;
        }
      }
    }

    const totalAssetsAtDate = financialAssetsAtDate + physicalAssetsAtDate;
    const netWorth = totalAssetsAtDate - debtsAtDate;
    const cashFlow = financialAssetsAtDate - creditCardDebtAtDate;

    return {
      date: formattedDate,
      netWorth,
      cashFlow,
      hasChange: hasChange,
    };
  });

  const yesterdayData = historicalData.find(
    (d) => d.date === format(endOfYesterday(), "dd/MM/yy")
  );
  const yesterdayNetWorth =
    yesterdayData?.netWorth ??
    (historicalData.length > 1
      ? historicalData[historicalData.length - 2].netWorth
      : 0);

  const todayNetWorth =
    historicalData.length > 0
      ? historicalData[historicalData.length - 1].netWorth
      : 0;

  const netWorthChange = todayNetWorth - yesterdayNetWorth;

  return {
    totalNetWorth,
    netWorthChange,
    currentCashFlow,
    historicalData,
    bankBreakdown,
    debtBreakdown,
    assetBreakdown,
  };
}
