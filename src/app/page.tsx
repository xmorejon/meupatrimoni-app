'use client';

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/firebase-service";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { Patrimony } from "@/models/patrimony";
import PrivateRoute from "@/components/PrivateRoute";

export default function Home() {
  const [data, setData] = useState<Patrimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const fetchedData = await getDashboardData();
        setData(fetchedData);
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
        <DashboardClient
          data={data}
        />
      )}
    </PrivateRoute>
  );
}
