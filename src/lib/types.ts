import type { Timestamp } from "firebase/firestore";

export interface BalanceEntry {
  id: string;
  bankId: string;
  bank: string;
  balance: number;
  timestamp: Date | Timestamp;
}

export interface Bank {
  id: string;
  name: string;
  balance: number;
  type: "Current Account" | "Investment Account";
  lastUpdated: Date | Timestamp;
  truelayerId?: string;
  providerId?: string;
}

export interface Debt {
  id: string;
  debtId?: string;
  name: string;
  balance: number;
  type: "Credit Card" | "Mortgage" | "Personnel Credit";
  lastUpdated: Date | Timestamp;
  truelayerId?: string;
  providerId?: string;
}

export interface Asset {
  id: string;
  assetId?: string;
  name: string;
  value: number;
  type: "House" | "Car";
  lastUpdated: Date | Timestamp;
  truelayerId?: string;
}

export interface ChartDataPoint {
  date: string;
  netWorth: number;
  cashFlow: number;
  hasChange?: boolean;
}

export interface DashboardData {
  totalNetWorth: number;
  netWorthChange: number;
  currentCashFlow: number;
  historicalData: ChartDataPoint[];
  bankBreakdown: Bank[];
  debtBreakdown: Debt[];
  assetBreakdown: Asset[];
  debug?: Array<any>;
}

export type Entry = Bank | Debt | Asset;
