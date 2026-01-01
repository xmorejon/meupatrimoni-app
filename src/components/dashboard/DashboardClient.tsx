"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { NetWorthChart } from "@/components/dashboard/NetWorthChart";
import { BankBreakdown } from "@/components/dashboard/BankBreakdown";
import { DebtBreakdown } from "@/components/dashboard/DebtBreakdown";
import { AssetBreakdown } from "@/components/dashboard/AssetBreakdown";
import { getDashboardData, simulateRealtimeUpdate, addOrUpdateDebt, addOrUpdateAsset, addOrUpdateBank } from "@/lib/mock-data";
import type { DashboardData, BankStatus, Debt, Asset } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import type { z } from 'zod';
import type { baseSchema } from '@/components/dashboard/EntryDialog';
import { useTranslations } from 'next-intl';

const DashboardSkeleton = () => (
  <div className="p-4 md:p-8 space-y-8">
    <Skeleton className="h-40 w-full rounded-lg" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Skeleton className="lg:col-span-2 h-96 rounded-lg" />
      <Skeleton className="lg:col-span-1 h-96 rounded-lg" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Skeleton className="h-96 rounded-lg" />
      <Skeleton className="h-96 rounded-lg" />
      <Skeleton className="h-96 rounded-lg" />
    </div>
  </div>
);

export function DashboardClient({ initialData, translations, locale }: { initialData: DashboardData, translations: any, locale: string }) {
  const [data, setData] = useState<DashboardData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const t = useTranslations('Dashboard');

  const refreshData = () => {
    const dashboardData = getDashboardData();
    setData(dashboardData);
  };

  useEffect(() => {
    // Simulate real-time updates from a Cloud Function
    const interval = setInterval(() => {
      simulateRealtimeUpdate();
      refreshData();
    }, 15000); // every 15 seconds

    return () => clearInterval(interval);
  }, []);

  const handleEntry = (values: z.infer<typeof baseSchema> & { balance?: number, value?: number }, type: 'Bank' | 'Debt' | 'Asset') => {
    switch (type) {
        case 'Bank':
            addOrUpdateBank(values as BankStatus);
            break;
        case 'Debt':
            addOrUpdateDebt(values as Debt);
            break;
        case 'Asset':
            addOrUpdateAsset(values as Asset);
            break;
    }
    refreshData();
  };

  const currentLocale = translations.locale[locale] || translations.locale['en'];
  const currency = translations.currency[locale] || translations.currency['en'];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header title={translations.dashboard.title}/>
      <main className="flex-1">
        {loading || !data ? (
          <DashboardSkeleton />
        ) : (
          <div className="p-4 md:p-8 space-y-8">
            <NetWorthCard 
              totalNetWorth={data.totalNetWorth} 
              change={data.netWorthChange} 
              cashFlow={data.currentCashFlow} 
              translations={translations.dashboard.netWorthCard}
              locale={currentLocale}
              currency={currency}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-3">
                <NetWorthChart 
                    data={data.historicalData} 
                    translations={translations.dashboard.netWorthChart}
                    locale={currentLocale}
                    currency={currency}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <BankBreakdown 
                    banks={data.bankBreakdown} 
                    onEntry={handleEntry}
                    translations={translations.dashboard}
                    locale={currentLocale}
                    currency={currency}
                />
                <DebtBreakdown 
                    debts={data.debtBreakdown} 
                    onEntry={handleEntry} 
                    translations={translations.dashboard}
                    locale={currentLocale}
                    currency={currency}
                />
                <AssetBreakdown 
                    assets={data.assetBreakdown} 
                    onEntry={handleEntry}
                    translations={translations.dashboard}
                    locale={currentLocale}
                    currency={currency}
                />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
