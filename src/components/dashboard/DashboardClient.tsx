"use client";

import { useState, useEffect, type FC } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ArrowRightLeft,
  LogOut,
  Menu,
  RefreshCw,
  TestTube,
} from "lucide-react";
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
} from "@/lib/firebase-service"; // Can be removed if only used for types
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
import { getAuth, signOut } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import useMobile from "@/hooks/use-mobile";
import { ItemHistoryDialog } from "@/components/dashboard/ItemHistoryDialog";

import { demoData } from "@/lib/demo-data";
interface DashboardClientProps {
  data: DashboardData | null;
}

// Define a more accurate type for the values coming from the dialog
type EntryData = z.infer<typeof baseSchema> & {
  balance?: number;
  value?: number;
};

const typeTranslations = {
  Bank: "Compte",
  Debt: "Deute",
  Asset: "Actiu",
};

export const DashboardClient: FC<DashboardClientProps> = ({ data }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isCsvImporterOpen, setIsCsvImporterOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isDemoMode, setIsDemoMode] = useState(
    searchParams.get("demo") === "true",
  );
  const [localData, setLocalData] = useState<DashboardData | null>(
    isDemoMode ? demoData : data,
  );

  useEffect(() => {
    setLocalData(isDemoMode ? demoData : data);
  }, [data, isDemoMode]);

  const toggleDemoMode = () => {
    const newDemoMode = !isDemoMode;
    setIsDemoMode(newDemoMode);
    router.replace(pathname + (newDemoMode ? "?demo=true" : ""));
  };

  const isMobile = useMobile();
  const [historyItem, setHistoryItem] = useState<{
    id: string;
    name: string;
    type: "Bank" | "Debt" | "Asset";
  } | null>(null);

  const getDemoHistory = (
    item: { id: string; type: "Bank" | "Debt" | "Asset" } | null,
  ) => {
    if (
      isDemoMode &&
      item &&
      item.type === "Bank" &&
      localData?.historicalBankData
    ) {
      return localData.historicalBankData[item.id] || [];
    }
    return undefined;
  };

  const handleEntry = async (
    values: EntryData,
    type: "Bank" | "Debt" | "Asset",
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

      const translatedType = typeTranslations[type];
      toast({
        title: "Èxit",
        description: `${translatedType} '${values.name}' ${action} correctament.`,
      });
      router.refresh(); // Re-fetch data
    } catch (error) {
      console.error(`Failed to add/update ${type}:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `No s'ha pogut desar el ${type}. Si us plau, intenta-ho de nou.`,
      });
      throw error;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    // Perform the actual data fetching
    const app = getApp();
    const functions = getFunctions(app, "europe-west1");
    const refreshTruelayerData = httpsCallable(
      functions,
      "refreshTruelayerData",
    );
    try {
      toast({
        title: "Actualitzant...",
        description:
          "S'estan actualitzant els comptes automàtics i important emails.",
      });

      const checkBankEmails = httpsCallable(functions, "checkBankEmails");

      const [truelayerResult, emailResult] = await Promise.all([
        refreshTruelayerData(),
        checkBankEmails(),
      ]);

      const truelayerMessage =
        (truelayerResult.data as any)?.message ||
        "Comptes automàtics actualitzats.";
      const emailCount = (emailResult.data as any)?.count;
      const emailMessage =
        emailCount > 0
          ? `${emailCount} emails importats.`
          : "Cap email nou per importar.";

      toast({
        title: "Actualització completada",
        description: `${truelayerMessage} ${emailMessage}`,
      });
    } catch (error: any) {
      // It's good practice to log the full error for debugging
      console.error("Error during handleRefresh:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `No s'ha pogut actualitzar: ${
          error.message || "Error desconegut."
        }`,
      });
    } finally {
      setIsRefreshing(false);
      // Re-fetch data from the server to get the actual updated balances.
      router.refresh();
    }
  };

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      router.push("/"); // Redirect to home page after logout
      toast({
        title: "Sessió tancada",
        description: "Has tancat la sessió correctament.",
      });
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No s'ha pogut tancar la sessió.",
      });
    }
  };

  const handleHistory = (
    item: { id: string; name: string },
    type: "Bank" | "Debt" | "Asset",
  ) => {
    setHistoryItem({ id: item.id, name: item.name, type });
  };

  const renderImportButton = (asChild: boolean) => (
    <Dialog open={isCsvImporterOpen} onOpenChange={setIsCsvImporterOpen}>
      <DialogTrigger asChild>
        <Button
          variant={asChild ? "ghost" : "outline"}
          className={asChild ? "w-full justify-start" : ""}
        >
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isMobile ? (
              "Importar"
            ) : (
              <span className="text-lg">Importar un arxiu CSV</span>
            )}
          </DialogTitle>
        </DialogHeader>
        <CsvImporter />
      </DialogContent>
    </Dialog>
  );

  const renderMenu = () => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={isMobile ? "icon" : "default"}>
            <Menu className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Menú</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <ConnectWithTrueLayer variant="ghost" />
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={toggleDemoMode}
            >
              <TestTube className="mr-2 h-4 w-4" />
              <span>{isDemoMode ? "Sortir del Mode Demo" : "Mode Demo"}</span>
            </Button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            {renderImportButton(true)}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Tancar sessió</span>
            </Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (!localData) {
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
    cashFlowChange,
    historicalData,
    bankBreakdown,
    debtBreakdown,
    assetBreakdown,
  } = localData;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img
            src="/logos/piggy-bank-512.png"
            alt="Patrimoni Familiar"
            className="h-8 w-8"
          />
          <h1 className="text-xl font-semibold">Patrimoni</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isMobile ? "" : "Act. comptes"}
          </Button>
          {renderMenu()}
        </div>
      </div>

      <Totals
        totalNetWorth={totalNetWorth}
        netWorthChange={netWorthChange}
        currentCashFlow={currentCashFlow}
        cashFlowChange={cashFlowChange}
      />

      <NetWorthChart data={historicalData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-1 flex flex-col gap-3">
          <BankBreakdown
            banks={bankBreakdown}
            onEntry={(values) => handleEntry(values, "Bank")}
            onHistory={(item) => handleHistory(item, "Bank")}
          />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-3">
          <DebtBreakdown
            debts={debtBreakdown}
            onEntry={(values) => handleEntry(values, "Debt")}
            onHistory={(item) => handleHistory(item, "Debt")}
          />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-3">
          <AssetBreakdown
            assets={assetBreakdown}
            onEntry={(values) => handleEntry(values, "Asset")}
            onHistory={(item) => handleHistory(item, "Asset")}
          />
        </div>
      </div>

      <ItemHistoryDialog
        isOpen={!!historyItem}
        onClose={() => setHistoryItem(null)}
        item={historyItem}
      />
    </div>
  );
};
