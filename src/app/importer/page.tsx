'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast";
import { getBankBreakdown, getDebtBreakdown, getAssetBreakdown } from '@/lib/firebase-service';
import type { Bank, Debt, Asset } from '@/lib/types';
import PrivateRoute from "@/components/PrivateRoute";
import { useTrueLayer } from "@/hooks/use-truelayer";
import ConnectWithTrueLayer from "@/components/connect-with-truelayer";

function ImporterPageContents() {
  // Log every single time this component function is executed.
  console.log(`[${new Date().toISOString()}] --- ImporterPageContents rendering ---`);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { exchangeCode, isLoading: isExchanging, error: exchangeError } = useTrueLayer();
  const { toast } = useToast();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effect to handle the TrueLayer callback
  useEffect(() => {
    console.log(`[${new Date().toISOString()}] --- TrueLayer processing useEffect RUNS ---`);
    console.log("Current searchParams:", searchParams.toString());

    const code = localStorage.getItem('truelayer_code');
    const storedError = localStorage.getItem('truelayer_error');
    
    console.log(`Code from localStorage: ${code}`);
    console.log(`Error from localStorage: ${storedError}`);

    if (code) {
      console.log("Found code in localStorage. Removing and exchanging...");
      localStorage.removeItem('truelayer_code'); // Clean up immediately
      exchangeCode(code).then(result => {
        if (result.success) {
          toast({ title: "Connexió exitosa!", description: `S'han importat ${result.accounts.length} comptes. Actualitzant dades...` });
          fetchData(false); // Re-fetch data
        } else {
          toast({ variant: "destructive", title: "Error de connexió", description: result.error || "No s'ha pogut connectar el teu compte bancari." });
        }
        router.replace('/importer'); // Clean the URL to avoid re-triggering
      });
    } else if (storedError) {
      console.log("Found error in localStorage. Removing and showing toast.");
      localStorage.removeItem('truelayer_error'); // Clean up immediately
      toast({ variant: "destructive", title: "Error en l'autorització", description: storedError });
      router.replace('/importer'); // Clean the URL
    } else {
      console.log("No code or error found in localStorage on this run.");
    }
  // The effect will re-run if any of these change. `searchParams` is the important one.
  }, [searchParams, exchangeCode, router, toast]);

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

        {/* The CSV import form can be re-added here later */}
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
