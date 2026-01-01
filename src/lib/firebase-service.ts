import { db } from '@/firebase/config';
import { collection, getDocs, doc, writeBatch, query, orderBy, limit, getDoc, setDoc, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import type { BankStatus, Debt, Asset, DashboardData, ChartDataPoint, BalanceEntry } from './types';
import { subDays, format, startOfToday, eachDayOfInterval, endOfToday } from 'date-fns';

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
    const q = query(entriesCol, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps<BalanceEntry>({ id: d.id, ...d.data() }));
}

export async function addOrUpdateBank(bankData: Partial<BankStatus> & { name: string; balance: number }): Promise<void> {
    const bankRef = bankData.id ? doc(db, 'banks', bankData.id) : doc(collection(db, 'banks'));

    const batch = writeBatch(db);

    // If it's a new bank, we just need to set the initial data and one balance entry.
    if (!bankData.id) {
         batch.set(bankRef, {
            name: bankData.name,
            balance: bankData.balance,
            lastUpdated: Timestamp.now(),
        });
    } else {
         // If it's an existing bank, we update its main document.
         batch.update(bankRef, {
            name: bankData.name,
            balance: bankData.balance,
            lastUpdated: Timestamp.now(),
        });
    }
    
    // Add a new entry to the balance history for both new and updated banks.
    const entryRef = doc(collection(db, 'balanceEntries'));
    batch.set(entryRef, {
        bank: bankData.name,
        balance: bankData.balance,
        timestamp: Timestamp.now()
    });

    await batch.commit();
}


export async function addOrUpdateDebt(debtData: Partial<Debt> & { name: string; balance: number; type: Debt['type'] }): Promise<void> {
    if (debtData.id) {
        const debtRef = doc(db, 'debts', debtData.id);
        await updateDoc(debtRef, { ...debtData, lastUpdated: Timestamp.now() });
    } else {
        const { id, ...newDebtData } = debtData;
        const debtsCol = collection(db, 'debts');
        await addDoc(debtsCol, { ...newDebtData, lastUpdated: Timestamp.now() });
    }
}

export async function addOrUpdateAsset(assetData: Partial<Asset> & { name: string; value: number; type: Asset['type'] }): Promise<void> {
    if (assetData.id) {
        const assetRef = doc(db, 'assets', assetData.id);
        await updateDoc(assetRef, { ...assetData, lastUpdated: Timestamp.now() });
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
  const thirtyDaysAgo = subDays(today, 30);
  const dateInterval = eachDayOfInterval({ start: thirtyDaysAgo, end: endOfToday() });

  const historicalData = dateInterval.map(date => {
    const financialAssetsAtDate = Array.from(new Set(balanceEntries.map(e => e.bank))).reduce((sum, bank) => {
      const latestEntryForBankAtDate = balanceEntries
        .filter(e => e.bank === bank && e.timestamp <= date)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      return sum + (latestEntryForBankAtDate?.balance || 0);
    }, 0);

    const assetsAtDate = financialAssetsAtDate + physicalAssets;
    const debtsAtDate = totalDebts; // Assuming debts and physical assets are constant for simplicity
    const creditCardDebtAtDate = creditCardDebt;

    return {
      date: format(date, 'MMM d'),
      netWorth: assetsAtDate - debtsAtDate,
      cashFlow: financialAssetsAtDate - creditCardDebtAtDate,
    };
  });
  
  const yesterdayNetWorth = historicalData.find(d => d.date === format(subDays(today, 1), 'MMM d'))?.netWorth || 0;
  const todayNetWorth = historicalData[historicalData.length - 1]?.netWorth || 0;
  const netWorthChange = todayNetWorth > 0 && yesterdayNetWorth > 0 && yesterdayNetWorth !== todayNetWorth ? ((todayNetWorth - yesterdayNetWorth) / Math.abs(yesterdayNetWorth)) * 100 : 0;

  return { totalNetWorth, netWorthChange, currentCashFlow, historicalData, bankBreakdown, debtBreakdown, assetBreakdown };
};
