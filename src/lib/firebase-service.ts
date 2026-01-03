
import { db } from '@/firebase/config';
import { collection, getDocs, doc, writeBatch, query, orderBy, getDoc, setDoc, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { BankStatus, Debt, Asset, DashboardData, BalanceEntry, Entry } from './types';
import { subDays, format, startOfToday, eachDayOfInterval, endOfDay, startOfDay, endOfYesterday } from 'date-fns';

// Helper function to convert Firestore Timestamps to Dates in nested objects
const convertTimestamps = <T>(data: any): T => {
    if (data?.lastUpdated instanceof Timestamp) {
        data.lastUpdated = data.lastUpdated.toDate();
    }
    if (data?.timestamp instanceof Timestamp) {
        data.timestamp = data.timestamp.toDate();
    }
    for (const key in data) {
        if (typeof data[key] === 'object' && data[key] !== null) {
            convertTimestamps(data[key]);
        }
    }
    return data as T;
};


export async function getBankBreakdown(): Promise<BankStatus[]> {
    const banksCol = collection(db, 'banks');
    const q = query(banksCol, orderBy('balance', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps<BankStatus>({ id: d.id, ...d.data() }));
}

export async function getDebtBreakdown(): Promise<Debt[]> {
    const debtsCol = collection(db, 'debts');
    const q = query(debtsCol, orderBy('balance', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps<Debt>({ id: d.id, ...d.data() }));
}

export async function getAssetBreakdown(): Promise<Asset[]> {
    const assetsCol = collection(db, 'assets');
    const q = query(assetsCol, orderBy('value', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps<Asset>({ id: d.id, ...d.data() }));
}

async function getBalanceEntries(): Promise<BalanceEntry[]> {
    const entriesCol = collection(db, 'balanceEntries');
    const q = query(entriesCol, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps<BalanceEntry>({ id: d.id, ...d.data() }));
}

async function getDebtEntries(): Promise<Array<Debt & { timestamp: Date, debtId: string }>> {
  const entriesCol = collection(db, 'debtEntries');
  const q = query(entriesCol, orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => convertTimestamps<Debt & { timestamp: Date, debtId: string }>({ id: d.id, ...d.data() }));
}

async function getAssetEntries(): Promise<Array<Asset & { timestamp: Date, assetId: string }>> {
  const entriesCol = collection(db, 'assetEntries');
  const q = query(entriesCol, orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => convertTimestamps<Asset & { timestamp: Date, assetId: string }>({ id: d.id, ...d.data() }));
}

export async function batchImportEntries(
  entryType: 'Bank' | 'Debt' | 'Asset',
  item: Entry,
  entries: { timestamp: Date; balance?: number; value?: number }[]
): Promise<void> {
  if (entries.length === 0) return;

  const batch = writeBatch(db);

  const collectionMap = {
    Bank: { entries: 'balanceEntries', main: 'banks' },
    Debt: { entries: 'debtEntries', main: 'debts' },
    Asset: { entries: 'assetEntries', main: 'assets' },
  };

  const { entries: entriesCollectionName, main: mainCollectionName } = collectionMap[entryType];
  const entriesRef = collection(db, entriesCollectionName);
  const itemRef = doc(db, mainCollectionName, item.id);

  entries.forEach(entry => {
    const newEntryRef = doc(entriesRef);
    const commonData = { timestamp: Timestamp.fromDate(entry.timestamp) };
    let specificData = {};

    switch (entryType) {
      case 'Bank':
        specificData = { bankId: item.id, bank: item.name, balance: entry.balance };
        break;
      case 'Debt':
        specificData = { debtId: item.id, name: item.name, type: (item as Debt).type, balance: entry.balance };
        break;

      case 'Asset':
        specificData = { assetId: item.id, name: item.name, type: (item as Asset).type, value: entry.value };
        break;
    }

    batch.set(newEntryRef, { ...commonData, ...specificData });
  });
  
  // Find the most recent entry in the imported data
  const latestEntry = entries.reduce((latest, current) =>
    current.timestamp > latest.timestamp ? current : latest
  );

  // Get the existing item document
  const itemDoc = await getDoc(itemRef);
  const itemData = itemDoc.data();
  const lastUpdated = itemData?.lastUpdated?.toDate() ?? new Date(0);

  // Only update the main item's balance/value if the latest imported entry is newer
  // than the last update.
  if (latestEntry.timestamp > lastUpdated) {
    const updatePayload: { balance?: number; value?: number; lastUpdated: Timestamp } = {
        lastUpdated: Timestamp.fromDate(latestEntry.timestamp),
    };

    if (entryType === 'Asset') {
        updatePayload.value = latestEntry.value;
    } else {
        updatePayload.balance = latestEntry.balance;
    }
    batch.update(itemRef, updatePayload);
  }

  await batch.commit();
}


export async function addOrUpdateBank(bankData: Partial<BankStatus> & { name: string; balance: number }): Promise<void> {
    const now = Timestamp.now();
    const batch = writeBatch(db);
    
    const bankRef = bankData.id ? doc(db, 'banks', bankData.id) : doc(collection(db, 'banks'));
    const { id, ...newBankData } = bankData;

    batch.set(bankRef, { ...newBankData, lastUpdated: now }, { merge: true });
    
    const balanceEntryRef = doc(collection(db, 'balanceEntries'));
    batch.set(balanceEntryRef, {
        bankId: bankRef.id,
        bank: newBankData.name,
        balance: newBankData.balance,
        timestamp: now
    });

    await batch.commit();
}


export async function addOrUpdateDebt(debtData: Partial<Debt> & { name: string; balance: number; type: Debt['type'] }): Promise<void> {
  const { id, ...payload } = debtData;
  const now = Timestamp.now();
  
  const debtRef = id ? doc(db, 'debts', id) : doc(collection(db, 'debts'));
  
  const batch = writeBatch(db);

  batch.set(debtRef, { ...payload, lastUpdated: now }, { merge: true });

  const debtEntryRef = doc(collection(db, 'debtEntries'));
  batch.set(debtEntryRef, {
    ...payload,
    debtId: debtRef.id,
    timestamp: now
  });

  await batch.commit();
}

export async function addOrUpdateAsset(assetData: Partial<Asset> & { name:string; value: number; type: Asset['type'] }): Promise<void> {
  const { id, ...payload } = assetData;
  const now = Timestamp.now();

  const assetRef = id ? doc(db, 'assets', id) : doc(collection(db, 'assets'));
  
  const batch = writeBatch(db);

  batch.set(assetRef, { ...payload, lastUpdated: now }, { merge: true });

  const assetEntryRef = doc(collection(db, 'assetEntries'));
  batch.set(assetEntryRef, {
    ...payload,
    assetId: assetRef.id,
    timestamp: now
  });

  await batch.commit();
}


export async function getDashboardData(): Promise<DashboardData> {
  const [bankBreakdown, debtBreakdown, assetBreakdown, balanceEntries, debtEntries, assetEntries] = await Promise.all([
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
    financialAssets += entry.balance;
  }

  let physicalAssets = 0;
  for (const asset of assetBreakdown) {
    physicalAssets += asset.value;
  }

  const totalAssets = financialAssets + physicalAssets;

  let totalDebts = 0;
  for (const debt of debtBreakdown) {
    totalDebts += debt.balance;
  }

  let creditCardDebt = 0;
  for (const debt of debtBreakdown) {
      if (debt.type === 'Credit Card') {
          creditCardDebt += debt.balance;
      }
  }

  const totalNetWorth = totalAssets - totalDebts;
  const currentCashFlow = financialAssets - creditCardDebt;
  
  // --- HISTORICAL CALCULATIONS ---
  const allEntries = [...balanceEntries, ...debtEntries, ...assetEntries];
  const today = startOfToday();
  const allTimestamps = allEntries.map(e => (e.timestamp as Date).getTime()).filter(t => !isNaN(t));
  
  const startDate = allTimestamps.length > 0 
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

    const groupedDebtEntries: Record<string, (Debt & { timestamp: Date, debtId: string })[]> = {};
    for (const entry of debtEntries) {
        const key = entry.debtId;
        if (!groupedDebtEntries[key]) {
            groupedDebtEntries[key] = [];
        }
        groupedDebtEntries[key].push(entry);
    }

    const groupedAssetEntries: Record<string, (Asset & { timestamp: Date, assetId: string })[]> = {};
    for (const entry of assetEntries) {
        const key = entry.assetId;
        if (!groupedAssetEntries[key]) {
            groupedAssetEntries[key] = [];
        }
        groupedAssetEntries[key].push(entry);
    }

  for (const key in groupedBalanceEntries) {
    groupedBalanceEntries[key].sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime());
  }
  for (const key in groupedDebtEntries) {
    groupedDebtEntries[key].sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime());
  }
  for (const key in groupedAssetEntries) {
    groupedAssetEntries[key].sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime());
  }

  const historicalData = dateInterval.map(date => {
    const endOfDate = endOfDay(date);

    let financialAssetsAtDate = 0;
    for (const bank of bankBreakdown) {
        const bankEntries = groupedBalanceEntries[bank.id] || [];
        const latestEntry = bankEntries.find(e => (e.timestamp as Date) <= endOfDate);
        if (latestEntry) {
            financialAssetsAtDate += latestEntry.balance;
        }
    }

    let physicalAssetsAtDate = 0;
    for (const asset of assetBreakdown) {
        const assetEntries = groupedAssetEntries[asset.id] || [];
        const latestEntry = assetEntries.find(e => (e.timestamp as Date) <= endOfDate);
        if (latestEntry) {
            physicalAssetsAtDate += latestEntry.value;
        }
    }
    
    let debtsAtDate = 0;
    for (const debt of debtBreakdown) {
        const debtEntries = groupedDebtEntries[debt.id] || [];
        const latestEntry = debtEntries.find(e => (e.timestamp as Date) <= endOfDate);
        if (latestEntry) {
            debtsAtDate += latestEntry.balance;
        }
    }

    let creditCardDebtAtDate = 0;
    for (const debt of debtBreakdown) {
        if (debt.type === 'Credit Card') {
            const debtEntries = groupedDebtEntries[debt.id] || [];
            const latestEntry = debtEntries.find(e => (e.timestamp as Date) <= endOfDate);
            if (latestEntry) {
                creditCardDebtAtDate += latestEntry.balance;
            }
        }
    }

    const totalAssetsAtDate = financialAssetsAtDate + physicalAssetsAtDate;
    const netWorth = totalAssetsAtDate - debtsAtDate;
    const cashFlow = financialAssetsAtDate - creditCardDebtAtDate;

    return {
      date: format(date, 'dd/MM/yy'),
      netWorth,
      cashFlow,
    };
  });
  
  const yesterdayData = historicalData.find(d => d.date === format(endOfYesterday(), 'dd/MM/yy'));
  const yesterdayNetWorth = yesterdayData?.netWorth ?? (historicalData.length > 1 ? historicalData[historicalData.length - 2].netWorth : totalNetWorth);
  
  const todayNetWorth = historicalData.length > 0 ? historicalData[historicalData.length - 1].netWorth : totalNetWorth;
  
  const netWorthChange = todayNetWorth > 0 && yesterdayNetWorth > 0 && yesterdayNetWorth !== todayNetWorth 
    ? ((todayNetWorth - yesterdayNetWorth) / Math.abs(yesterdayNetWorth)) * 100 
    : 0;

  return { totalNetWorth, netWorthChange, currentCashFlow, historicalData, bankBreakdown, debtBreakdown, assetBreakdown };
};
