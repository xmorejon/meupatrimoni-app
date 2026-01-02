
import { db } from '@/firebase/config';
import { collection, getDocs, doc, writeBatch, query, orderBy, limit, getDoc, setDoc, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
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
    if (debtData.id) {
        const debtRef = doc(db, 'debts', debtData.id);
        const { id, ...updatedDebtData } = debtData;
        await updateDoc(debtRef, { ...updatedDebtData, lastUpdated: Timestamp.now() });
    } else {
        const { id, ...newDebtData } = debtData;
        const debtsCol = collection(db, 'debts');
        await addDoc(debtsCol, { ...newDebtData, lastUpdated: Timestamp.now() });
    }
}

export async function addOrUpdateAsset(assetData: Partial<Asset> & { name: string; value: number; type: Asset['type'] }): Promise<void> {
    if (assetData.id) {
        const assetRef = doc(db, 'assets', assetData.id);
        const { id, ...updatedAssetData } = assetData;
        await updateDoc(assetRef, { ...updatedAssetData, lastUpdated: Timestamp.now() });
    } else {
        const { id, ...newAssetData } = assetData;
        const assetsCol = collection(db, 'assets');
        await addDoc(assetsCol, { ...newAssetData, lastUpdated: Timestamp.now() });
    }
}


export async function getDashboardData(): Promise<DashboardData> {
  const [bankBreakdown, debtBreakdown, assetBreakdown, balanceEntries] = await Promise.all([
    getBankBreakdown(),
    getDebtBreakdown(),
    getAssetBreakdown(),
    getBalanceEntries(),
  ]);

  const financialAssets = bankBreakdown.reduce((sum, entry) => sum + entry.balance, 0);
  const physicalAssets = assetBreakdown.reduce((sum, asset) => sum + asset.value, 0);
  const totalAssets = financialAssets + physicalAssets;
  const totalDebts = debtBreakdown.reduce((sum, debt) => sum + debt.balance, 0);
  const creditCardDebt = debtBreakdown.filter(d => d.type === 'Credit Card').reduce((sum, debt) => sum + debt.balance, 0);
  const totalNetWorth = totalAssets - totalDebts;
  const currentCashFlow = financialAssets - creditCardDebt;
  
  const today = startOfToday();
  // Determine the start date from the oldest balance entry, or default to 90 days ago if no entries exist
  const startDate = balanceEntries.length > 0 
    ? startOfDay(balanceEntries[0].timestamp as Date)
    : subDays(today, 90);

  const dateInterval = eachDayOfInterval({ start: startDate, end: endOfToday() });

  const historicalData = dateInterval.map(date => {
    const financialAssetsAtDate = Array.from(new Set(balanceEntries.map(e => e.bank))).reduce((sum, bank) => {
      const latestEntryForBankAtDate = balanceEntries
        .filter(e => e.bank === bank && (e.timestamp as Date) <= date)
        .sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime())[0];
      return sum + (latestEntryForBankAtDate?.balance || 0);
    }, 0);

    const assetsAtDate = financialAssetsAtDate + physicalAssets;
    const debtsAtDate = totalDebts; // Assuming debts and physical assets are constant for simplicity
    const creditCardDebtAtDate = creditCardDebt;

    return {
      date: format(date, 'dd/MM/yy'),
      netWorth: assetsAtDate - debtsAtDate,
      cashFlow: financialAssetsAtDate - creditCardDebtAtDate,
    };
  });
  
  const yesterdayNetWorth = historicalData.find(d => d.date === format(subDays(today, 1), 'dd/MM/yy'))?.netWorth || 0;
  const todayNetWorth = historicalData[historicalData.length - 1]?.netWorth || 0;
  const netWorthChange = todayNetWorth > 0 && yesterdayNetWorth > 0 && yesterdayNetWorth !== todayNetWorth ? ((todayNetWorth - yesterdayNetWorth) / Math.abs(yesterdayNetWorth)) * 100 : 0;

  return { totalNetWorth, netWorthChange, currentCashFlow, historicalData, bankBreakdown, debtBreakdown, assetBreakdown };
};
