"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  getBankBreakdown,
  getDebtBreakdown,
  getAssetBreakdown,
} from "@/lib/firebase-service";
import type { Bank, Debt, Asset } from "@/lib/types";
import PrivateRoute from "@/components/PrivateRoute";
import { useTrueLayer } from "@/hooks/use-truelayer";
import ConnectWithTrueLayer from "@/components/connect-with-truelayer";
import { CsvImporter } from "@/components/CsvImporter";

export default function ImporterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          Carregant...
        </div>
      }
    >
      <ImporterPageContents />
    </Suspense>
  );
}

function ImporterPageContents() {
  const { isLoading: isExchanging, error: exchangeError } = useTrueLayer();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsDataLoading(true);
    setDataError(null);
    try {
      const [fetchedBanks, fetchedDebts, fetchedAssets] = await Promise.all([
        getBankBreakdown(),
        getDebtBreakdown(),
        getAssetBreakdown(),
      ]);
      setBanks(fetchedBanks);
      setDebts(fetchedDebts);
      setAssets(fetchedAssets);
    } catch (err) {
      setDataError(
        "You do not have permission to view this data. Please sign in.",
      );
    } finally {
      if (showLoading) setIsDataLoading(false);
    }
  }, []);

  // Effect for initial data fetching
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isDataLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Carregant...
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="flex justify-center items-center h-screen">
        Error: {dataError}
      </div>
    );
  }

  return (
    <PrivateRoute>
      <div className="space-y-8 max-w-xl mx-auto my-8">
        <Card>
          <CardHeader>
            <CardTitle>Connectar amb el teu banc</CardTitle>
            <CardDescription>
              {isExchanging
                ? "Connectant... Si us plau, espera."
                : "Importa automàticament les teves dades connectant amb el teu banc."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConnectWithTrueLayer disabled={isExchanging} />
            {exchangeError && (
              <p className="text-red-500 mt-2">Error: {exchangeError}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Importar un arxiu CSV</CardTitle>
            <CardDescription>
              Importa un arxiu CSV amb les teves dades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CsvImporter />
          </CardContent>
        </Card>
      </div>
    </PrivateRoute>
  );
}
