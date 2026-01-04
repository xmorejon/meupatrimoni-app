'use client';

import { useEffect, useState } from 'react';
import { ImporterClient } from "@/components/importer/ImporterClient";
import { getBankBreakdown, getDebtBreakdown, getAssetBreakdown } from "@/lib/firebase-service";
import { Bank } from "@/models/bank";
import { Asset } from "@/models/asset";
import { Debt } from "@/models/debt";
import PrivateRoute from "@/components/PrivateRoute";

export default function ImportPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
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
        console.error(err);
        setError("You do not have permission to view this data. Please sign in.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <PrivateRoute>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div>Error: {error}</div>
      ) : (
        <ImporterClient banks={banks} debts={debts} assets={assets} />
      )}
    </PrivateRoute>
  );
}
