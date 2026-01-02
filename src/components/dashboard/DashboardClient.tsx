"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { NetWorthChart } from "@/components/dashboard/NetWorthChart";
import { BankBreakdown } from "@/components/dashboard/BankBreakdown";
import { DebtBreakdown } from "@/components/dashboard/DebtBreakdown";
import { AssetBreakdown } from "@/components/dashboard/AssetBreakdown";
import { getDashboardData, addOrUpdateDebt, addOrUpdateAsset, addOrUpdateBank } from "@/lib/firebase-service";
import type { DashboardData, BankStatus, Debt, Asset } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import type { z } from 'zod';
import type { baseSchema } from '@/components/dashboard/EntryDialog';
import { useTranslations } from 'next-intl';

const DashboardSkeleton = () => (
  <div className="p-4 md:p-8 space-y-8">
    <Skeleton className="h-40 w-full rounded-lg" />
    <Skeleton className="h-96 rounded-lg" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Skeleton className="h-96 rounded-lg" />
      <Skeleton className="h-96 rounded-lg" />
      <Skeleton className="h-96 rounded-lg" />
    </div>
  </div>
);

export function DashboardClient({ initialData, locale }: { initialData: DashboardData, locale: string }) {
  const [data, setData] = useState<DashboardData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const t = useTranslations();

  const translations = {
    dashboard: t.raw('Dashboard'),
    locale: t.raw('Locale'),
    currency: t.raw('Currency'),
  };

  const refreshData = async () => {
    setLoading(true);
    const dashboardData = await getDashboardData();
    setData(dashboardData);
    setLoading(false);
  };
  
  const handleEntry = async (values: z.infer<typeof baseSchema> & { balance?: number, value?: number }, type: 'Bank' | 'Debt' | 'Asset') => {
    const id = typeof values.id === 'string' ? values.id : (values.id ? String(values.id) : Date.now().toString());
    const now = new Date();
    switch (type) {
        case 'Bank':
            await addOrUpdateBank({
              id,
              name: values.name,
              balance: values.balance ?? 0,
              lastUpdated: now,
            } as BankStatus);
            break;
        case 'Debt':
            await addOrUpdateDebt({
              id,
              name: values.name,
              balance: values.balance ?? 0,
              type: (values as any).type ?? 'Credit Card',
              lastUpdated: now,
            } as Debt);
            break;
        case 'Asset':
            await addOrUpdateAsset({
              id,
              name: values.name,
              value: values.value ?? 0,
              type: (values as any).type ?? 'House',
              lastUpdated: now,
            } as Asset);
            break;
    }
    await refreshData();
  };

  const currentLocale = translations.locale[locale as keyof typeof translations.locale] || translations.locale['en'];
  const currency = "EUR";

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
            <NetWorthChart 
                data={data.historicalData} 
                translations={translations.dashboard.netWorthChart}
                locale={currentLocale}
                currency={currency}
            />
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
