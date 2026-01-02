
import { db } from '@/firebase/config';
import { collection, getDocs, doc, writeBatch, query, orderBy, limit, getDoc, setDoc, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { BankStatus, Debt, Asset, DashboardData, ChartDataPoint, BalanceEntry, Entry } from './types';
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

export async function batchImportEntries(bank: BankStatus, entries: { timestamp: Date, balance: number }[]): Promise<void> {
  if (entries.length === 0) return;

  const batch = writeBatch(db);
  const balanceEntriesRef = collection(db, 'balanceEntries');
  const bankRef = doc(db, 'banks', bank.id);

  entries.forEach(entry => {
    const newEntryRef = doc(balanceEntriesRef);
    batch.set(newEntryRef, {
      bankId: bank.id,
      bank: bank.name,
      balance: entry.balance,
      timestamp: Timestamp.fromDate(entry.timestamp),
    });
  });

  const latestEntry = entries.reduce((latest, current) =>
    current.timestamp > latest.timestamp ? current : latest
  );

  batch.update(bankRef, {
    balance: latestEntry.balance,
    lastUpdated: Timestamp.fromDate(latestEntry.timestamp),
  });

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

  const allEntries = [...balanceEntries, ...debtEntries, ...assetEntries];

  // --- CURRENT TOTALS ---
  const financialAssets = bankBreakdown.reduce((sum, entry) => sum + entry.balance, 0);
  const physicalAssets = assetBreakdown.reduce((sum, asset) => sum + asset.value, 0);
  const totalAssets = financialAssets + physicalAssets;
  const totalDebts = debtBreakdown.reduce((sum, debt) => sum + debt.balance, 0);
  const creditCardDebt = debtBreakdown.filter(d => d.type === 'Credit Card').reduce((sum, debt) => sum + Math.abs(debt.balance), 0);
  const totalNetWorth = totalAssets - totalDebts;
  const currentCashFlow = financialAssets - creditCardDebt;
  
  // --- HISTORICAL CALCULATIONS ---
  const today = startOfToday();
  const allTimestamps = allEntries.map(e => (e.timestamp as Date).getTime()).filter(t => !isNaN(t));
  
  const startDate = allTimestamps.length > 0 
    ? startOfDay(new Date(Math.min(...allTimestamps))) 
    : subDays(today, 90);

  const dateInterval = eachDayOfInterval({ start: startDate, end: today });

  const historicalData = dateInterval.map(date => {
    const endOfDate = endOfDay(date);

    const relevantBankEntries = balanceEntries.filter(e => (e.timestamp as Date) <= endOfDate);
    const financialAssetsAtDate = relevantBankEntries.length > 0
        ? relevantBankEntries.sort((a,b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime())[0].balance
        : 0;

    const relevantAssetEntries = assetEntries.filter(e => (e.timestamp as Date) <= endOfDate);
    const physicalAssetsAtDate = assetBreakdown.reduce((sum, asset) => {
        const latestEntry = relevantAssetEntries
            .filter(e => e.assetId === asset.id)
            .sort((a,b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime())[0];
        return sum + (latestEntry ? latestEntry.value : 0);
    }, 0);
    
    const relevantDebtEntries = debtEntries.filter(e => (e.timestamp as Date) <= endOfDate);
    const debtsAtDate = debtBreakdown.reduce((sum, debt) => {
        const latestEntry = relevantDebtEntries
            .filter(e => e.debtId === debt.id)
            .sort((a,b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime())[0];
        return sum + (latestEntry ? latestEntry.balance : 0);
    }, 0);
    const creditCardDebtAtDate = debtBreakdown.filter(d => d.type === 'Credit Card').reduce((sum, debt) => {
        const latestEntry = relevantDebtEntries
            .filter(e => e.debtId === debt.id)
            .sort((a,b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime())[0];
        return sum + (latestEntry ? Math.abs(latestEntry.balance) : 0);
    }, 0);

    const totalAssetsAtDate = financialAssetsAtDate + physicalAssetsAtDate;

    return {
      date: format(date, 'dd/MM/yy'),
      netWorth: totalAssetsAtDate - debtsAtDate,
      cashFlow: financialAssetsAtDate - creditCardDebtAtDate,
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
