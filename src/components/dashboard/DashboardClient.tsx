"use client";

import { useState, type FC } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Menu, RefreshCw } from "lucide-react";
import type { z } from "zod";

import { NetWorthChart } from "./NetWorthChart";
import { BankBreakdown } from "./BankBreakdown";
import { DebtBreakdown } from "./DebtBreakdown";
import { AssetBreakdown } from "./AssetBreakdown";
import { Totals } from "./Totals";
import { baseSchema } from "./EntryDialog";
import {
  addOrUpdateBank,
  addOrUpdateDebt,
  addOrUpdateAsset,
} from "@/lib/firebase-service";
import type { DashboardData } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import ConnectWithTrueLayer from "@/components/connect-with-truelayer";
import { CsvImporter } from "@/components/CsvImporter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import useMobile from "@/hooks/use-mobile";

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
  const isMobile = useMobile();

  const handleEntry = async (
    values: EntryData,
    type: "Bank" | "Debt" | "Asset"
  ) => {
    try {
      const action = values.id ? "actualitzat" : "afegit";
      // Create a payload that can be customized for each type.
      const payload: any = { ...values };

      switch (type) {
        case "Bank":
          if (payload.id) payload.bankId = payload.id;
          await addOrUpdateBank(payload);
          break;
        case "Debt":
          if (payload.id) payload.debtId = payload.id;
          await addOrUpdateDebt(payload);
          break;
        case "Asset":
          if (payload.id) payload.assetId = payload.id;
          await addOrUpdateAsset(payload);
          break;
      }

      toast({
        title: "Èxit",
        description: `${type} '${values.name}' ${action} correctament.`,
      });
      router.refresh();
    } catch (error) {
      console.error(`Failed to add/update ${type}:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `No s'ha pogut desar el ${type}. Si us plau, intenta-ho de nou.`,
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const app = getApp();
    const functions = getFunctions(app, "europe-west1");
    const refreshTruelayerData = httpsCallable(
      functions,
      "refreshTruelayerData"
    );
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
        description:
          "No s'ha pogut actualitzar els comptes. Si us plau, intenta-ho de nou.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderImportButton = (asChild: boolean) => (
    <Dialog open={isCsvImporterOpen} onOpenChange={setIsCsvImporterOpen}>
      <DialogTrigger asChild={asChild}>
        {asChild ? (
          <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Importar CSV
          </button>
        ) : (
          <Button variant="outline">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
        </DialogHeader>
        <CsvImporter />
      </DialogContent>
    </Dialog>
  );

  const renderMenu = () => {
    if (isMobile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <ConnectWithTrueLayer variant="ghost" />
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              {renderImportButton(true)}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <ConnectWithTrueLayer variant="outline" />
        {renderImportButton(false)}
      </div>
    );
  };

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4">No hi ha dades per mostrar.</p>
        <div className="flex gap-2">
          <ConnectWithTrueLayer />
          {renderImportButton(false)}
        </div>
      </div>
    );
  }

  const {
    totalNetWorth,
    netWorthChange,
    currentCashFlow,
    historicalData,
    bankBreakdown,
    debtBreakdown,
    assetBreakdown,
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
          {renderMenu()}
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
          <BankBreakdown
            banks={bankBreakdown}
            onEntry={(values) => handleEntry(values, "Bank")}
          />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <DebtBreakdown
            debts={debtBreakdown}
            onEntry={(values) => handleEntry(values, "Debt")}
          />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <AssetBreakdown
            assets={assetBreakdown}
            onEntry={(values) => handleEntry(values, "Asset")}
          />
        </div>
      </div>
    </div>
  );
};
