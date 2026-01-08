'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getBankBreakdown, getDebtBreakdown, getAssetBreakdown } from '@/lib/firebase-service';
import type { BankStatus, Debt, Asset } from '@/lib/types';
import PrivateRoute from "@/components/PrivateRoute";
import { useTrueLayer } from "@/hooks/use-truelayer";
import ConnectWithTrueLayer from "@/components/connect-with-truelayer";
import { CsvImporter } from '@/components/CsvImporter';

function ImporterPageContents() {
  // Log every single time this component function is executed.
  console.log(`[${new Date().toISOString()}] --- ImporterPageContents rendering ---`);

  const { isLoading: isExchanging, error: exchangeError } = useTrueLayer();

  const [banks, setBanks] = useState<BankStatus[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effect for initial data fetching
  useEffect(() => {
    console.log(`[${new Date().toISOString()}] --- Initial data fetch useEffect RUNS ---`);
    fetchData();
  }, []);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [fetchedBanks, fetchedDebts, fetchedAssets] = await Promise.all([
        getBankBreakdown(), getDebtBreakdown(), getAssetBreakdown(),
      ]);
      setBanks(fetchedBanks);
      setDebts(fetchedDebts);
      setAssets(fetchedAssets);
    } catch (err) {
      setError("You do not have permission to view this data. Please sign in.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Carregant...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen">Error: {error}</div>;
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
                    : "Importa automàticament les teves dades connectant amb el teu banc."
                }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConnectWithTrueLayer disabled={isExchanging} />
            {exchangeError && <p className="text-red-500 mt-2">Error: {exchangeError}</p>}
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

export default function ImporterPage() {
    return (
        <Suspense fallback={<div>Carregant...</div>}>
            <ImporterPageContents />
        </Suspense>
    );
}
