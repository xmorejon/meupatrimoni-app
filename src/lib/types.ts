import type { Timestamp } from 'firebase/firestore';

export interface BalanceEntry {
  id: string;
  bankId: string;
  bank: string;
  balance: number;
  timestamp: Date | Timestamp;
}

export interface BankStatus {
  id: string;
  name: string;
  balance: number;
  lastUpdated: Date | Timestamp;
}

export interface Debt {
  id:string;
  debtId?: string;
  name: string;
  balance: number;
  type: 'Credit Card' | 'Mortgage' | 'Personnel Credit';
  lastUpdated: Date | Timestamp;
}

export interface Asset {
  id: string;
  assetId?: string;
  name: string;
  value: number;
  type: 'House' | 'Car';
  lastUpdated: Date | Timestamp;
}

export interface ChartDataPoint {
  date: string;
  netWorth: number;
  cashFlow: number;
}

export interface DashboardData {
  totalNetWorth: number;
  netWorthChange: number;
  currentCashFlow: number;
  historicalData: ChartDataPoint[];
  bankBreakdown: BankStatus[];
  debtBreakdown: Debt[];
  assetBreakdown: Asset[];
  debug?: Array<any>;
}

export type Entry = BankStatus | Debt | Asset;
