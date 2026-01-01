export interface BalanceEntry {
  id: string;
  bank: string;
  balance: number;
  timestamp: Date;
}

export interface BankStatus {
  name: string;
  balance: number;
  lastUpdated: Date;
}

export interface Debt {
  id: string;
  name: string;
  balance: number;
  type: 'Credit Card' | 'Mortgage';
  lastUpdated: Date;
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  type: 'House' | 'Car';
  lastUpdated: Date;
}

export interface ChartDataPoint {
  date: string;
  netWorth: number;
}

export interface DashboardData {
  totalNetWorth: number;
  netWorthChange: number;
  currentCashFlow: number;
  historicalData: ChartDataPoint[];
  bankBreakdown: BankStatus[];
  debtBreakdown: Debt[];
  assetBreakdown: Asset[];
}
