
"use client";

import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Banknote, Landmark, TrendingUp, HandCoins, PiggyBank, ReceiptText, ArrowRightLeft } from 'lucide-react';

import { NetWorthChart } from './NetWorthChart';
import { Breakdown } from './Breakdown';
import { Totals } from './Totals';

import type { DashboardData } from '@/lib/types';

interface DashboardClientProps {
  data: DashboardData | null;
}

export const DashboardClient: FC<DashboardClientProps> = ({ data }) => {
  const router = useRouter();

  if (!data) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <p className="mb-4">No hi ha dades per mostrar.</p>
            <Button onClick={() => router.push('/import')}>Importar Dades</Button>
        </div>
    );
  }

  const { 
    totalNetWorth, netWorthChange, currentCashFlow, 
    historicalData, bankBreakdown, debtBreakdown, assetBreakdown 
  } = data;

  return (
    <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <Button onClick={() => router.push('/import')} variant="outline">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Importar
            </Button>
        </div>

      <Totals 
        totalNetWorth={totalNetWorth} 
        netWorthChange={netWorthChange} 
        currentCashFlow={currentCashFlow} 
      />

      <NetWorthChart data={historicalData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Breakdown title="Bancs" items={bankBreakdown} type="bank" />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Breakdown title="Deutes" items={debtBreakdown} type="debt" />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Breakdown title="Actius" items={assetBreakdown} type="asset" />
        </div>
      </div>
    </div>
  );
};
