'use client';

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/firebase-service";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { Patrimony } from "@/models/patrimony";
import PrivateRoute from "@/components/PrivateRoute";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Patrimony[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (user) {
        setIsFetching(true);
        try {
          const fetchedData = await getDashboardData();
          setData(fetchedData);
          setError(null);
        } catch (err) {
          console.error("Data fetching error:", err);
          setError("You do not have permission to view this data.");
          setData(null);
        } finally {
          setIsFetching(false);
        }
      } else {
        // If there's no user, ensure data is cleared and we're not in a fetching state.
        setData(null);
        setIsFetching(false);
      }
    }

    fetchData();
  }, [user?.uid]); // DEPEND ON THE STABLE USER ID, NOT THE OBJECT

  const isLoading = authLoading || isFetching;

  return (
    <PrivateRoute>
      {isLoading ? (
        <div>Loading dashboard...</div>
      ) : error ? (
        <div>Error: {error}</div>
      ) : data ? (
        <DashboardClient data={data} />
      ) : (
        !authLoading && !user && <div>Please log in to see the dashboard.</div>
      )}
    </PrivateRoute>
  );
}
