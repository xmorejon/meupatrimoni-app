import type { DashboardData } from "@/lib/types";

export const demoData: DashboardData = {
  totalNetWorth: 150250.75,
  netWorthChange: 1250.5,
  currentCashFlow: 550.25,
  cashFlowChange: -50.75,
  historicalData: [
    { date: "01/01/24", netWorth: 145000, cashFlow: 400 },
    { date: "01/02/24", netWorth: 146500, cashFlow: 450 },
    { date: "01/03/24", netWorth: 148000, cashFlow: 500 },
    { date: "01/04/24", netWorth: 149000, cashFlow: 600 },
    { date: "01/05/24", netWorth: 150250.75, cashFlow: 550.25 },
  ],
  bankBreakdown: [
    {
      id: "demo-bank-1",
      name: "Compte Nòmina",
      balance: 5200.5,
      providerId: "caixabank",
      truelayerId: "demo-truelayer-1",
      lastUpdated: new Date(),
      type: "Current Account",
    },
    {
      id: "demo-bank-2",
      name: "Compte Estalvis",
      balance: 15000.0,
      providerId: "bbva",
      truelayerId: "demo-truelayer-2",
      lastUpdated: new Date(),
      type: "Current Account",
    },
    {
      id: "demo-bank-3",
      name: "Fons d'Inversió",
      balance: 25000.0,
      lastUpdated: new Date(),
      type: "Investment Account",
    },
  ],
  debtBreakdown: [
    {
      id: "demo-debt-1",
      name: "Hipoteca Principal",
      balance: -180000.0,
      type: "Mortgage",
      lastUpdated: new Date(),
    },
    {
      id: "demo-debt-2",
      name: "Targeta de Crèdit",
      balance: -1500.25,
      providerId: "caixabank",
      truelayerId: "demo-truelayer-3",
      lastUpdated: new Date(),
      type: "Credit Card",
    },
    {
      id: "demo-debt-3",
      name: "Préstec Cotxe",
      balance: -8000.0,
      lastUpdated: new Date(),
      type: "Personnel Credit",
    },
  ],
  assetBreakdown: [
    {
      id: "demo-asset-1",
      name: "Casa Principal",
      value: 300000.0,
      type: "House",
      lastUpdated: new Date(),
    },
    {
      id: "demo-asset-2",
      name: "Cotxe Familiar",
      value: 15000.0,
      type: "Car",
      lastUpdated: new Date(),
    },
  ],
};
