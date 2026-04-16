import type { DashboardData } from "@/lib/types";

const generateHistoricalData = () => {
  const data = [];
  let netWorth = 150000;
  let cashFlow = 500;
  for (let i = 0; i < 100; i++) {
    const date = new Date(2026, 3, i + 7); // April is month 3 (0-indexed)
    netWorth += Math.random() * 500 - 200;
    cashFlow += Math.random() * 50 - 25;
    data.push({
      date: `${String(date.getDate()).padStart(2, "0")}/${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`,
      netWorth: parseFloat(netWorth.toFixed(2)),
      cashFlow: parseFloat(cashFlow.toFixed(2)),
    });
  }
  return data;
};

const newHistoricalData = generateHistoricalData();
const lastEntry = newHistoricalData[newHistoricalData.length - 1];

export const demoData: DashboardData = {
  totalNetWorth: lastEntry.netWorth,
  netWorthChange: lastEntry.netWorth - newHistoricalData[0].netWorth,
  currentCashFlow: lastEntry.cashFlow,
  cashFlowChange: lastEntry.cashFlow - newHistoricalData[0].cashFlow,
  historicalData: newHistoricalData,
  bankBreakdown: [
    {
      id: "demo-bank-1",
      name: "Compte Nòmina",
      balance: 5200.5,
      providerId: "xs2a-redsys-banco-santander",
      truelayerId: "demo-truelayer-1",
      lastUpdated: new Date(),
      type: "Current Account",
    },
    {
      id: "demo-bank-2",
      name: "Compte Estalvis",
      balance: 15000.0,
      providerId: "ob-revolut-es",
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
      providerId: "xs2a-ing-spain",
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
