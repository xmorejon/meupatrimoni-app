"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { NetWorthChart } from "@/components/dashboard/NetWorthChart";
import { BankBreakdown } from "@/components/dashboard/BankBreakdown";
import { DebtBreakdown } from "@/components/dashboard/DebtBreakdown";
import { addBalanceEntry, getDashboardData, simulateRealtimeUpdate } from "@/lib/mock-data";
import type { DashboardData } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import type { z } from 'zod';
import type { manualEntrySchema } from '@/components/dashboard/ManualEntryDialog';

const DashboardSkeleton = () => (
  <div className="p-4 md:p-8 space-y-8">
    <Skeleton className="h-40 w-full rounded-lg" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Skeleton className="lg:col-span-2 h-96 rounded-lg" />
      <Skeleton className="lg:col-span-1 h-96 rounded-lg" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Skeleton className="h-96 rounded-lg" />
      <Skeleton className="h-96 rounded-lg" />
    </div>
  </div>
);

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshData = () => {
    const dashboardData = getDashboardData();
    setData(dashboardData);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    // Simulate real-time updates from a Cloud Function
    const interval = setInterval(() => {
      simulateRealtimeUpdate();
      refreshData();
    }, 15000); // every 15 seconds

    return () => clearInterval(interval);
  }, []);

  const handleAddBalance = (values: z.infer<typeof manualEntrySchema>) => {
    addBalanceEntry(values.bank, values.balance);
    refreshData();
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header onAddBalance={handleAddBalance} />
      <main className="flex-1">
        {loading || !data ? (
          <DashboardSkeleton />
        ) : (
          <div className="p-4 md:p-8 space-y-8">
            <NetWorthCard totalNetWorth={data.totalNetWorth} change={data.netWorthChange} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-3">
                <NetWorthChart data={data.historicalData} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <BankBreakdown banks={data.bankBreakdown} />
                <DebtBreakdown debts={data.debtBreakdown} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
