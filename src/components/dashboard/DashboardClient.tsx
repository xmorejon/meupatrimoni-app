
"use client";

import { useState, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, RefreshCw } from 'lucide-react';
import type { z } from 'zod';

import { NetWorthChart } from './NetWorthChart';
import { BankBreakdown } from './BankBreakdown';
import { DebtBreakdown } from './DebtBreakdown';
import { AssetBreakdown } from './AssetBreakdown';
import { Totals } from './Totals';
import { baseSchema } from './EntryDialog';
import { addOrUpdateBank, addOrUpdateDebt, addOrUpdateAsset } from '@/lib/firebase-service';
import type { DashboardData } from '@/lib/types';
import { useToast } from "@/components/ui/use-toast";
import ConnectWithTrueLayer from '@/components/connect-with-truelayer';
import { CsvImporter } from '@/components/CsvImporter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

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
  const { toast } = useToast();
  const [isCsvImporterOpen, setIsCsvImporterOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const app = getApp();
    const functions = getFunctions(app, 'europe-west1');
    const refreshTruelayerData = httpsCallable(functions, 'refreshTruelayerData');
    try {
      const result = await refreshTruelayerData();
      toast({
        title: "Èxit",
        description: (result.data as any).message,
      });
      router.refresh();
    } catch (error) {
      console.error("Error refreshing accounts:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No s'ha pogut actualitzar els comptes. Si us plau, intenta-ho de nou.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderImportButton = () => (
    <Dialog open={isCsvImporterOpen} onOpenChange={setIsCsvImporterOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
        </DialogHeader>
        <CsvImporter />
      </DialogContent>
    </Dialog>
  );


  if (!data) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <p className="mb-4">No hi ha dades per mostrar.</p>
            <div className="flex gap-2">
                <ConnectWithTrueLayer />
                {renderImportButton()}
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
            <h1 className="text-2xl font-semibold pl-4">Patrimoni Familiar</h1>
            <div className="flex items-center gap-2">
                <Button onClick={handleRefresh} disabled={isRefreshing}>
                  {isRefreshing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Actualitzar comptes
                </Button>
                <ConnectWithTrueLayer variant="outline" />
                {renderImportButton()}
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
