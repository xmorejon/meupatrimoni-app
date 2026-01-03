
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { NetWorthChart } from './NetWorthChart';
import { Breakdown } from './Breakdown';
import { Totals } from './Totals';
import type { DashboardData } from '@/lib/types';

interface DashboardClientProps {
  data: DashboardData | null;
}

export function DashboardClient({ data }: DashboardClientProps) {
  const router = useRouter();

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-center text-muted-foreground mb-4">No hi ha dades per mostrar.</p>
        <Button onClick={() => router.push('/import')}>Importar Dades</Button>
      </div>
    );
  }

  const { totalNetWorth, netWorthChange, currentCashFlow, historicalData, bankBreakdown, debtBreakdown, assetBreakdown } = data;

  return (
    <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <Button onClick={() => router.push('/import')}>Importar</Button>
        </div>
      <Totals 
        totalNetWorth={totalNetWorth} 
        netWorthChange={netWorthChange} 
        currentCashFlow={currentCashFlow} 
      />
      <NetWorthChart data={historicalData} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Breakdown title="Actius Financers" items={bankBreakdown} type="bank" />
        <Breakdown title="Altres Actius" items={assetBreakdown} type="asset" />
        <Breakdown title="Deutes" items={debtBreakdown} type="debt" />
      </div>
    </div>
  );
}
