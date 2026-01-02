
import { db } from '@/firebase/config';
import { collection, getDocs, doc, writeBatch, query, orderBy, limit, getDoc, setDoc, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { BankStatus, Debt, Asset, DashboardData, ChartDataPoint, BalanceEntry } from './types';
import { subDays, format, startOfToday, eachDayOfInterval, endOfToday, startOfDay } from 'date-fns';

// Helper function to convert Firestore Timestamps to Dates in nested objects
const convertTimestamps = <T>(data: any): T => {
    const convertValue = (value: any): any => {
        if (value instanceof Timestamp) {
            return value.toDate();
        }
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const newObj: { [key: string]: any } = {};
            for (const key in value) {
                newObj[key] = convertValue(value[key]);
            }
            return newObj;
        }
        return value;
    };
    return convertValue(data);
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

async function getDebtEntries(): Promise<Array<Debt & { timestamp: Date }>> {
  const entriesCol = collection(db, 'debtEntries');
  const q = query(entriesCol, orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => convertTimestamps<Debt & { timestamp: Date }>({ id: d.id, ...d.data() }));
}

async function getAssetEntries(): Promise<Array<Asset & { timestamp: Date }>> {
  const entriesCol = collection(db, 'assetEntries');
  const q = query(entriesCol, orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => convertTimestamps<Asset & { timestamp: Date }>({ id: d.id, ...d.data() }));
}

export async function batchImportBalanceEntries(
  bank: BankStatus,
  entries: { timestamp: Date; balance: number }[]
): Promise<void> {
  const batch = writeBatch(db);

  entries.forEach(entry => {
    const entryRef = doc(collection(db, 'balanceEntries'));
    batch.set(entryRef, {
      bankId: bank.id,
      bank: bank.name,
      balance: entry.balance,
      timestamp: Timestamp.fromDate(entry.timestamp)
    });
  });

  if (entries.length > 0) {
    const latestEntry = entries.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    );
    const bankRef = doc(db, 'banks', bank.id);
    batch.update(bankRef, {
        balance: latestEntry.balance,
        lastUpdated: Timestamp.fromDate(latestEntry.timestamp)
    });
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
  ];
  
  const startDate = allCreationDates.length > 0 
    ? startOfDay(new Date(Math.min(...allCreationDates))) 
    : subDays(today, 90);

  const dateInterval = eachDayOfInterval({ start: startDate, end: endOfToday() });

  const historicalData = dateInterval.map(date => {
    const endOfDate = endOfToday(date);
    
    // --- Bank Balances ---
    const bankIds = new Set(bankBreakdown.map(b => b.id));
    const financialAssetsAtDate = Array.from(bankIds).reduce((sum, bankId) => {
        const latestEntry = balanceEntries
            .filter(e => e.bankId === bankId && e.timestamp <= endOfDate)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        
        if (latestEntry) return sum + latestEntry.balance;

        const currentBank = bankBreakdown.find(b => b.id === bankId);
        if (currentBank && (currentBank.lastUpdated as Date) <= endOfDate) {
            return sum + currentBank.balance;
        }

        return sum;
    }, 0);

    // --- Asset Values ---
    const assetIds = new Set(assetBreakdown.map(a => a.id));
    const physicalAssetsAtDate = Array.from(assetIds).reduce((sum, assetId) => {
        const latestEntry = assetEntries
            .filter(e => e.assetId === assetId && e.timestamp <= endOfDate)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

        if (latestEntry) return sum + latestEntry.value;

        const currentAsset = assetBreakdown.find(a => a.id === assetId);
        if (currentAsset && (currentAsset.lastUpdated as Date) <= endOfDate) {
            return sum + currentAsset.value;
        }

        return sum;
    }, 0);

    // --- Debt Balances ---
    const debtIds = new Set(debtBreakdown.map(d => d.id));
    const debtsAtDate = Array.from(debtIds).reduce((sum, debtId) => {
        const latestEntry = debtEntries
            .filter(e => e.debtId === debtId && e.timestamp <= endOfDate)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

        if (latestEntry) return sum + latestEntry.balance;

        const currentDebt = debtBreakdown.find(d => d.id === debtId);
        if (currentDebt && (currentDebt.lastUpdated as Date) <= endOfDate) {
            return sum + currentDebt.balance;
        }

        return sum;
    }, 0);

    const creditCardDebtAtDate = Array.from(debtIds).reduce((sum, debtId) => {
        const debtDef = debtBreakdown.find(d => d.id === debtId);
        if (debtDef?.type !== 'Credit Card') return sum;

        const latestEntry = debtEntries
            .filter(e => e.debtId === debtId && e.type === 'Credit Card' && e.timestamp <= endOfDate)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

        if (latestEntry) return sum + Math.abs(latestEntry.balance);

        const currentDebt = debtBreakdown.find(d => d.id === debtId);
         if (currentDebt && (currentDebt.lastUpdated as Date) <= endOfDate) {
            return sum + Math.abs(currentDebt.balance);
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
  
  const yesterdayNetWorth = historicalData.find(d => d.date === format(subDays(today, 1), 'dd/MM/yy'))?.netWorth || totalNetWorth;
  const todayNetWorth = historicalData[historicalData.length - 1]?.netWorth || totalNetWorth;
  
  const netWorthChange = todayNetWorth > 0 && yesterdayNetWorth > 0 && yesterdayNetWorth !== todayNetWorth 
    ? ((todayNetWorth - yesterdayNetWorth) / Math.abs(yesterdayNetWorth)) * 100 
    : 0;

  return { totalNetWorth, netWorthChange, currentCashFlow, historicalData, bankBreakdown, debtBreakdown, assetBreakdown };
};
