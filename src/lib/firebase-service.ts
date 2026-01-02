
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

export async function batchImportEntries(
  type: 'Bank' | 'Debt' | 'Asset',
  item: BankStatus | Debt | Asset,
  entries: { timestamp: Date; balance?: number; value?: number }[]
): Promise<void> {
  const batch = writeBatch(db);
  let collectionName: string;
  let itemRef: any;
  let updatePayload: any = {};

  switch (type) {
    case 'Bank':
      collectionName = 'balanceEntries';
      itemRef = doc(db, 'banks', item.id);
      break;
    case 'Debt':
      collectionName = 'debtEntries';
      itemRef = doc(db, 'debts', item.id);
      break;
    case 'Asset':
      collectionName = 'assetEntries';
      itemRef = doc(db, 'assets', item.id);
      break;
  }

  entries.forEach(entry => {
    const entryRef = doc(collection(db, collectionName));
    let payload: any = {
        timestamp: Timestamp.fromDate(entry.timestamp)
    };
    if (type === 'Bank') {
        payload.bankId = item.id;
        payload.bank = item.name;
        payload.balance = entry.balance;
    } else if (type === 'Debt') {
        payload.debtId = item.id;
        payload.name = item.name;
        payload.balance = entry.balance;
        payload.type = (item as Debt).type;
    } else if (type === 'Asset') {
        payload.assetId = item.id;
        payload.name = item.name;
        payload.value = entry.value;
        payload.type = (item as Asset).type;
    }
    batch.set(entryRef, payload);
  });

  if (entries.length > 0) {
    const latestEntry = entries.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    );
    
    if (type === 'Asset') {
        updatePayload.value = latestEntry.value;
    } else {
        updatePayload.balance = latestEntry.balance;
    }
    updatePayload.lastUpdated = Timestamp.fromDate(latestEntry.timestamp);
    
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
  const allCreationDates = [
    ...bankBreakdown.map(b => (b.lastUpdated as Date).getTime()),
    ...debtBreakdown.map(d => (d.lastUpdated as Date).getTime()),
    ...assetBreakdown.map(a => (a.lastUpdated as Date).getTime()),
    ...allEntries.map(e => e.timestamp.getTime())
  ].filter(t => !isNaN(t));
  
  const startDate = allCreationDates.length > 0 
    ? startOfDay(new Date(Math.min(...allCreationDates))) 
    : subDays(today, 90);

  const dateInterval = eachDayOfInterval({ start: startDate, end: today });

  const historicalData = dateInterval.map(date => {
    const endOfDate = endOfDay(date);

    const bankIds = new Set(bankBreakdown.map(b => b.id));
    const financialAssetsAtDate = Array.from(bankIds).reduce((sum, bankId) => {
        const relevantEntries = balanceEntries.filter(e => e.bankId === bankId && e.timestamp <= endOfDate);
        if (relevantEntries.length > 0) {
            const latestEntry = relevantEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
            return sum + latestEntry.balance;
        }
        return sum;
    }, 0);

    const assetIds = new Set(assetBreakdown.map(a => a.id));
    const physicalAssetsAtDate = Array.from(assetIds).reduce((sum, assetId) => {
        const relevantEntries = assetEntries.filter(e => e.assetId === assetId && e.timestamp <= endOfDate);
        if (relevantEntries.length > 0) {
            const latestEntry = relevantEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
            return sum + latestEntry.value;
        }
        return sum;
    }, 0);
    
    const allDebtItems = [...debtBreakdown];
    const debtIds = new Set(allDebtItems.map(d => d.id));

    const debtsAtDate = Array.from(debtIds).reduce((sum, debtId) => {
        const relevantEntries = debtEntries.filter(e => e.debtId === debtId && e.timestamp <= endOfDate);
        if (relevantEntries.length > 0) {
            const latestEntry = relevantEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
            return sum + latestEntry.balance;
        }
        return sum;
    }, 0);

    const creditCardDebtAtDate = Array.from(debtIds).reduce((sum, debtId) => {
        const debtDef = allDebtItems.find(d => d.id === debtId);
        if (debtDef?.type !== 'Credit Card') return sum;
        
        const relevantEntries = debtEntries.filter(e => e.debtId === debtId && e.type === 'Credit Card' && e.timestamp <= endOfDate);
        if (relevantEntries.length > 0) {
            const latestEntry = relevantEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
            return sum + Math.abs(latestEntry.balance);
        }
        return sum;
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
