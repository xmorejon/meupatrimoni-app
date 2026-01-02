
import { db } from '@/firebase/config';
import { collection, getDocs, doc, writeBatch, query, orderBy, limit, getDoc, setDoc, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { BankStatus, Debt, Asset, DashboardData, ChartDataPoint, BalanceEntry } from './types';
import { subDays, format, startOfToday, eachDayOfInterval, endOfToday, startOfDay } from 'date-fns';

// Helper function to convert Firestore Timestamps to Dates in nested objects
const convertTimestamps = <T>(data: any): T => {
    if (data?.timestamp instanceof Timestamp) {
        return { ...data, timestamp: data.timestamp.toDate() };
    }
    if (data?.lastUpdated instanceof Timestamp) {
        return { ...data, lastUpdated: data.lastUpdated.toDate() };
    }
    return data;
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
    const q = query(entriesCol, orderBy('timestamp', 'asc')); // Order by asc to find the oldest easily
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps<BalanceEntry>({ id: d.id, ...d.data() }));
}

// Optional debt history entries. If present, they should have fields: id, name, balance, type, timestamp
async function getDebtEntries(): Promise<Array<{ id: string; name: string; balance: number; type: string; timestamp: Date }>> {
  const entriesCol = collection(db, 'debtEntries');
  const q = query(entriesCol, orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => convertTimestamps<any>({ id: d.id, ...d.data() }));
}

export async function batchImportBalanceEntries(
  bank: BankStatus,
  entries: { timestamp: Date; balance: number }[]
): Promise<void> {
  const batch = writeBatch(db);

  entries.forEach(entry => {
    const entryRef = doc(collection(db, 'balanceEntries'));
    batch.set(entryRef, {
      bank: bank.name,
      balance: entry.balance,
      timestamp: Timestamp.fromDate(entry.timestamp)
    });
  });

  // After import, find the most recent entry and update the main bank document
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
    const bankRef = bankData.id ? doc(db, 'banks', bankData.id) : doc(collection(db, 'banks'));
    const { id, ...newBankData } = bankData;

    await setDoc(bankRef, { ...newBankData, lastUpdated: Timestamp.now() }, { merge: true });
}


export async function addOrUpdateDebt(debtData: Partial<Debt> & { name: string; balance: number; type: Debt['type'] }): Promise<void> {
  const { id, ...payload } = debtData;
  const now = Timestamp.now();
  
  const debtRef = id ? doc(db, 'debts', id) : doc(collection(db, 'debts'));
  
  // Start a batch write
  const batch = writeBatch(db);

  // 1. Update the main 'debts' document
  batch.set(debtRef, { ...payload, lastUpdated: now }, { merge: true });

  // 2. Create a historical entry in 'debtEntries'
  const debtEntryRef = doc(collection(db, 'debtEntries'));
  batch.set(debtEntryRef, {
    name: payload.name,
    balance: payload.balance,
    type: payload.type,
    timestamp: now,
    debtId: debtRef.id // Link to the main debt document
  });

  // Commit the batch
  await batch.commit();
}

export async function addOrUpdateAsset(assetData: Partial<Asset> & { name: string; value: number; type: Asset['type'] }): Promise<void> {
  const { id, ...payload } = assetData;
  if (id) {
    const assetRef = doc(db, 'assets', id);
    await setDoc(assetRef, { ...payload, lastUpdated: Timestamp.now() }, { merge: true });
  } else {
    const assetsCol = collection(db, 'assets');
    await addDoc(assetsCol, { ...payload, lastUpdated: Timestamp.now() });
  }
}


export async function getDashboardData(): Promise<DashboardData> {
  const [bankBreakdown, debtBreakdown, assetBreakdown, balanceEntries, debtEntries] = await Promise.all([
    getBankBreakdown(),
    getDebtBreakdown(),
    getAssetBreakdown(),
    getBalanceEntries(),
    // try to load historical debt entries if the collection exists
    getDebtEntries(),
  ]);

  // Diagnostic dump: show what debts and debtEntries we have (timestamps converted to ISO)
  const serialize = (obj: any) => JSON.parse(JSON.stringify(obj, (k, v) => {
    if (v instanceof Date) return v.toISOString();
    return v;
  }));
  console.log('DBG bankBreakdown:', serialize(bankBreakdown));
  console.log('DBG debtBreakdown:', serialize(debtBreakdown));
  console.log('DBG debtEntries:', serialize(debtEntries));

  const financialAssets = bankBreakdown.reduce((sum, entry) => sum + entry.balance, 0);
  const physicalAssets = assetBreakdown.reduce((sum, asset) => sum + asset.value, 0);
  const totalAssets = financialAssets + physicalAssets;
  const totalDebts = debtBreakdown.reduce((sum, debt) => sum + debt.balance, 0);
  const creditCardDebt = debtBreakdown.filter(d => d.type === 'Credit Card').reduce((sum, debt) => sum + Math.abs(debt.balance), 0);
  const totalNetWorth = totalAssets - totalDebts;
  const currentCashFlow = financialAssets - creditCardDebt;
  
  const today = startOfToday();
  // Determine the start date from the absolute oldest balance entry, or default to 90 days ago if no entries exist
  const startDate = balanceEntries.length > 0
    ? startOfDay(new Date(Math.min(...balanceEntries.map(e => (e.timestamp as Date).getTime()))))
    : subDays(today, 90);

  const dateInterval = eachDayOfInterval({ start: startDate, end: endOfToday() });

  const debug: Array<{
    date: string;
    banks: Record<string, number>;
    debts: Record<string, number>;
    financialAssetsAtDate: number;
    creditCardDebtAtDate: number;
  }> = [];

  const historicalData = dateInterval.map(date => {
    const banks = Array.from(new Set([...balanceEntries.map(e => e.bank), ...bankBreakdown.map(b => b.name)]));
    const bankValues: Record<string, number> = {};
    const financialAssetsAtDate = banks.reduce((sum, bank) => {
      const latestEntryForBankAtDate = balanceEntries
        .filter(e => e.bank === bank && (e.timestamp as Date) <= date)
        .sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime())[0];
      // prefer historical entry at-or-before the date
      if (latestEntryForBankAtDate) {
        const val = latestEntryForBankAtDate.balance || 0;
        bankValues[bank] = val;
        return sum + val;
      }
      // if no historical entry exists for that date, fallback to current bank snapshot (so banks without history still contribute)
      const bankCurrent = bankBreakdown.find(b => b.name === bank);
      const val = bankCurrent?.balance || 0;
      bankValues[bank] = val;
      return sum + val;
    }, 0);

    const assetsAtDate = financialAssetsAtDate + physicalAssets;
    const debtsAtDate = totalDebts; // total debts snapshot
    
    // --- START: Corrected Debt Calculation Logic ---
    const debtValues: Record<string, number> = {};
    
    // Combine all unique credit card debt names from both current and historical data
    const allCreditCardDebtNames = Array.from(new Set([
        ...debtBreakdown.filter(d => d.type === 'Credit Card').map(d => d.name),
        ...debtEntries.filter(d => d.type === 'Credit Card').map(d => d.name)
    ]));

    const creditCardDebtAtDate = allCreditCardDebtNames.reduce((sum, name) => {
        // Find the latest historical entry for this debt on or before the current date
        const latestHistoricalEntry = debtEntries
            .filter(e => e.name === name && e.type === 'Credit Card' && (e.timestamp as Date) <= date)
            .sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime())[0];

        let debtValue = 0;
        if (latestHistoricalEntry) {
            // If a historical entry is found, use its balance
            debtValue = Math.abs(latestHistoricalEntry.balance);
        } else {
            // Otherwise, find the current debt record
            const currentDebt = debtBreakdown.find(d => d.name === name && d.type === 'Credit Card');
            if (currentDebt) {
                const lastUpdated = currentDebt.lastUpdated as Date;
                // Use the current balance only if the debt was created on or before the date
                if (lastUpdated && startOfDay(lastUpdated) <= date) {
                    debtValue = Math.abs(currentDebt.balance);
                }
            }
        }
        
        debtValues[name] = debtValue;
        return sum + debtValue;
    }, 0);
    // --- END: Corrected Debt Calculation Logic ---

    debug.push({
      date: format(date, 'dd/MM/yy'),
      banks: bankValues,
      debts: debtValues,
      financialAssetsAtDate,
      creditCardDebtAtDate,
    });

    return {
      date: format(date, 'dd/MM/yy'),
      netWorth: assetsAtDate - debtsAtDate,
      cashFlow: financialAssetsAtDate - creditCardDebtAtDate,
    };
  });

  // Log the last 14 days debug info to help debugging
  const recent = debug.slice(-14);
  console.log('Dashboard debug (last 14 days):', JSON.stringify(recent, null, 2));
  
  const yesterdayNetWorth = historicalData.find(d => d.date === format(subDays(today, 1), 'dd/MM/yy'))?.netWorth || 0;
  const todayNetWorth = historicalData[historicalData.length - 1]?.netWorth || 0;
  const netWorthChange = todayNetWorth > 0 && yesterdayNetWorth > 0 && yesterdayNetWorth !== todayNetWorth ? ((todayNetWorth - yesterdayNetWorth) / Math.abs(yesterdayNetWorth)) * 100 : 0;

  return { totalNetWorth, netWorthChange, currentCashFlow, historicalData, bankBreakdown, debtBreakdown, assetBreakdown, debug };
};
