
"use client";

import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft } from 'lucide-react';
import type { z } from 'zod';

import { NetWorthChart } from './NetWorthChart';
import { BankBreakdown } from './BankBreakdown';
import { DebtBreakdown } from './DebtBreakdown';
import { AssetBreakdown } from './AssetBreakdown';
import { Totals } from './Totals';
import type { entrySchema } from './EntryDialog';
import { addOrUpdateBank, addOrUpdateDebt, addOrUpdateAsset } from '@/lib/firebase-service';
import type { DashboardData, Debt, Asset } from '@/lib/types';
import { useToast } from "@/components/ui/use-toast"

interface DashboardClientProps {
  data: DashboardData | null;
}

export const DashboardClient: FC<DashboardClientProps> = ({ data }) => {
  const router = useRouter();
  const { toast } = useToast()

  const handleEntry = async (values: z.infer<typeof entrySchema>, type: 'Bank' | 'Debt' | 'Asset') => {
    try {
      let action = values.id ? 'actualitzat' : 'afegit';
      switch (type) {
        case 'Bank':
          await addOrUpdateBank({ ...values, balance: Number(values.value) });
          break;
        case 'Debt':
          await addOrUpdateDebt({ ...values, balance: Number(values.value), type: values.type as Debt['type'] });
          break;
        case 'Asset':
          await addOrUpdateAsset({ ...values, value: Number(values.value), type: values.type as Asset['type'] });
          break;
      }
      toast({
        title: "Èxit",
        description: `${type} '${values.name}' ${action} correctament.`,
      })
      router.refresh();
    } catch (error) {
      console.error(`Failed to add/update ${type}:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `No s'ha pogut desar el ${type}. Si us plau, intenta-ho de nou.`,
      })
    }
  };


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
          <BankBreakdown banks={bankBreakdown} onEntry={(values) => handleEntry(values, 'Bank')} />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <DebtBreakdown debts={debtBreakdown} onEntry={(values) => handleEntry(values, 'Debt')} />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <AssetBreakdown assets={assetBreakdown} onEntry={(values) => handleEntry(values, 'Asset')} />
        </div>
      </div>
    </div>
  );
};
