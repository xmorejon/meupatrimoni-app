import { BalanceEntry, BankStatus, ChartDataPoint, DashboardData, Debt, Asset } from '@/lib/types';
import { subDays, format, startOfToday, eachDayOfInterval, endOfToday } from 'date-fns';

let balanceEntries: BalanceEntry[] = [
  // Initial data for the last 30 days
  // Bank A
  { id: '1', bank: 'Banco Neon', balance: 1250.75, timestamp: subDays(new Date(), 28) },
  { id: '2', bank: 'Banco Neon', balance: 1300.00, timestamp: subDays(new Date(), 21) },
  { id: '3', bank: 'Banco Neon', balance: 1100.50, timestamp: subDays(new Date(), 14) },
  { id: '4', bank: 'Banco Neon', balance: 1500.25, timestamp: subDays(new Date(), 7) },
  { id: '5', bank: 'Banco Neon', balance: 1450.00, timestamp: subDays(new Date(), 1) },

  // Bank B
  { id: '6', bank: 'NuBank', balance: 5300.00, timestamp: subDays(new Date(), 25) },
  { id: '7', bank: 'NuBank', balance: 5800.00, timestamp: subDays(new Date(), 18) },
  { id: '8', bank: 'NuBank', balance: 6200.50, timestamp: subDays(new Date(), 10) },
  { id: '9', bank: 'NuBank', balance: 6150.75, timestamp: subDays(new Date(), 2) },

  // Bank C
  { id: '10', bank: 'Banco Inter', balance: 15000.00, timestamp: subDays(new Date(), 30) },
  { id: '11', bank: 'Banco Inter', balance: 15250.00, timestamp: subDays(new Date(), 15) },
  { id: '12', bank: 'Banco Inter', balance: 15500.00, timestamp: subDays(new Date(), 5) },
];

let debts: Debt[] = [
    { id: 'd1', name: 'Visa Credit Card', balance: 850.50, type: 'Credit Card', lastUpdated: subDays(new Date(), 3) },
    { id: 'd2', name: 'House Mortgage', balance: 185000.00, type: 'Mortgage', lastUpdated: subDays(new Date(), 1) },
];

let assets: Asset[] = [
    { id: 'a1', name: 'Primary Residence', value: 350000.00, type: 'House', lastUpdated: subDays(new Date(), 30) },
    { id: 'a2', name: 'Toyota Corolla', value: 22000.00, type: 'Car', lastUpdated: subDays(new Date(), 90) },
];


export const getDashboardData = (): DashboardData => {
  // 1. Get latest balance for each bank
  const latestBalances = new Map<string, BalanceEntry>();
  for (const entry of balanceEntries) {
    if (!latestBalances.has(entry.bank) || entry.timestamp > latestBalances.get(entry.bank)!.timestamp) {
      latestBalances.set(entry.bank, entry);
    }
  }
  
  // 2. Get total assets (financial + physical)
  const financialAssets = Array.from(latestBalances.values()).reduce((sum, entry) => sum + entry.balance, 0);
  const physicalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalAssets = financialAssets + physicalAssets;

  // 3. Get total debts and credit card debt
  const totalDebts = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const creditCardDebt = debts.filter(d => d.type === 'Credit Card').reduce((sum, debt) => sum + debt.balance, 0);

  // 4. Calculate Total Net Worth
  const totalNetWorth = totalAssets - totalDebts;

  // 4.5 Calculate Current Cash Flow
  const currentCashFlow = financialAssets - creditCardDebt;

  // 5. Create Bank Breakdown
  const bankBreakdown: BankStatus[] = Array.from(latestBalances.values())
    .map(entry => ({
      name: entry.bank,
      balance: entry.balance,
      lastUpdated: entry.timestamp,
    }))
    .sort((a, b) => b.balance - a.balance);
    
  // 6. Create Debt Breakdown
  const debtBreakdown: Debt[] = debts.sort((a,b) => b.balance - a.balance);

  // 6.5. Create Asset Breakdown
  const assetBreakdown: Asset[] = assets.sort((a,b) => b.value - a.value);

  // 7. Calculate historical net worth for the chart
  const today = startOfToday();
  const thirtyDaysAgo = subDays(today, 30);
  const dateInterval = eachDayOfInterval({ start: thirtyDaysAgo, end: endOfToday() });

  const historicalData = dateInterval.map(date => {
    const assetsAtDate = Array.from(new Set(balanceEntries.map(e => e.bank))).reduce((sum, bank) => {
      const latestEntryForBankAtDate = balanceEntries
        .filter(e => e.bank === bank && e.timestamp <= date)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      return sum + (latestEntryForBankAtDate?.balance || 0);
    }, 0) + physicalAssets; // Assuming physical assets value is constant for simplicity
    
    // For simplicity, assuming debts are constant over the last 30 days
    const debtsAtDate = debts.reduce((sum, debt) => sum + debt.balance, 0);

    return {
      date: format(date, 'MMM d'),
      netWorth: assetsAtDate - debtsAtDate,
    };
  });
  
  // 8. Calculate net worth change from yesterday
  const yesterdayNetWorth = historicalData.find(d => d.date === format(subDays(today, 1), 'MMM d'))?.netWorth || 0;
  const todayNetWorth = historicalData.find(d => d.date === format(today, 'MMM d'))?.netWorth || 0;
  const netWorthChange = todayNetWorth > 0 && yesterdayNetWorth > 0 && yesterdayNetWorth !== todayNetWorth ? ((todayNetWorth - yesterdayNetWorth) / Math.abs(yesterdayNetWorth)) * 100 : 0;


  return { totalNetWorth, netWorthChange, currentCashFlow, historicalData, bankBreakdown, debtBreakdown, assetBreakdown };
};

export const addBalanceEntry = (bank: string, balance: number) => {
  const newEntry: BalanceEntry = {
    id: String(balanceEntries.length + 1),
    bank,
    balance,
    timestamp: new Date(),
  };
  balanceEntries.push(newEntry);
};

// Simulate Cloud Function adding data
export const simulateRealtimeUpdate = () => {
  const banks = ['Banco Neon', 'NuBank', 'Banco Inter', 'C6 Bank'];
  const randomBank = banks[Math.floor(Math.random() * banks.length)];
  const lastEntry = balanceEntries
    .filter(e => e.bank === randomBank)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  
  const lastBalance = lastEntry ? lastEntry.balance : 5000;
  const newBalance = lastBalance * (1 + (Math.random() - 0.45) * 0.1); // +/- 5% change

  addBalanceEntry(randomBank, newBalance);
};
