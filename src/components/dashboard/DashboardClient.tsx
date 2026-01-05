
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
import type { baseSchema } from './EntryDialog';
import { addOrUpdateBank, addOrUpdateDebt, addOrUpdateAsset } from '@/lib/firebase-service';
import type { DashboardData } from '@/lib/types';
import { useToast } from "@/components/ui/use-toast";
import { ConnectWithPowens } from '@/components/connect-with-powens'; // Import the new component

interface DashboardClientProps {
  data: DashboardData | null;
}

// Define a more accurate type for the values coming from the dialog
  type EntryData = z.infer<typeof baseSchema> & {
  balance?: number;
  value?: number;
};

export const DashboardClient: FC<DashboardClientProps> = ({ data }) => {
  const router = useRouter();
  const { toast } = useToast()

  const handleEntry = async (values: EntryData, type: 'Bank' | 'Debt' | 'Asset') => {
    try {
      const action = values.id ? 'actualitzat' : 'afegit';
      
      switch (type) {
        case 'Bank':
          await addOrUpdateBank(values as any);
          break;
        case 'Debt':
          await addOrUpdateDebt(values as any);
          break;
        case 'Asset':
          await addOrUpdateAsset(values as any);
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
            {/* Also add the button here for the empty state */}
            <div className="flex gap-2">
                <ConnectWithPowens />
                <Button onClick={() => router.push('/import')}>Importar Dades Manualment</Button>
            </div>
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
            {/* Group the buttons together */}
            <div className="flex items-center gap-2">
                <ConnectWithPowens />
                <Button onClick={() => router.push('/import')} variant="outline">
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Importar
                </Button>
            </div>
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
