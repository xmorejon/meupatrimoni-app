import { BalanceEntry, BankStatus, ChartDataPoint, DashboardData } from '@/lib/types';
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

export const getDashboardData = (): DashboardData => {
  // 1. Get latest balance for each bank
  const latestBalances = new Map<string, BalanceEntry>();
  for (const entry of balanceEntries) {
    if (!latestBalances.has(entry.bank) || entry.timestamp > latestBalances.get(entry.bank)!.timestamp) {
      latestBalances.set(entry.bank, entry);
    }
  }

  // 2. Calculate Total Net Worth
  const totalNetWorth = Array.from(latestBalances.values()).reduce((sum, entry) => sum + entry.balance, 0);

  // 3. Create Bank Breakdown
  const bankBreakdown: BankStatus[] = Array.from(latestBalances.values())
    .map(entry => ({
      name: entry.bank,
      balance: entry.balance,
      lastUpdated: entry.timestamp,
    }))
    .sort((a, b) => b.balance - a.balance);

  // 4. Calculate historical net worth for the chart
  const today = startOfToday();
  const thirtyDaysAgo = subDays(today, 30);
  const dateInterval = eachDayOfInterval({ start: thirtyDaysAgo, end: endOfToday() });

  const historicalData = dateInterval.map(date => {
    const netWorthAtDate = Array.from(new Set(balanceEntries.map(e => e.bank))).reduce((sum, bank) => {
      const latestEntryForBankAtDate = balanceEntries
        .filter(e => e.bank === bank && e.timestamp <= date)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      return sum + (latestEntryForBankAtDate?.balance || 0);
    }, 0);

    return {
      date: format(date, 'MMM d'),
      netWorth: netWorthAtDate,
    };
  });
  
  // 5. Calculate net worth change from yesterday
  const yesterdayNetWorth = historicalData.find(d => d.date === format(subDays(today, 1), 'MMM d'))?.netWorth || 0;
  const todayNetWorth = historicalData.find(d => d.date === format(today, 'MMM d'))?.netWorth || 0;
  const netWorthChange = todayNetWorth > 0 && yesterdayNetWorth > 0 ? ((todayNetWorth - yesterdayNetWorth) / yesterdayNetWorth) * 100 : 0;


  return { totalNetWorth, netWorthChange, historicalData, bankBreakdown };
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
