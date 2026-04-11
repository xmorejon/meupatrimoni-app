import { useState, useEffect } from "react";
import { getDashboardData } from "@/lib/firebase-service";
import { DashboardData } from "@/lib/types";
import { User } from "firebase/auth";

export function useDashboardData(user: User | null | undefined) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (user) {
        setIsFetching(true);
        try {
          const fetchedData = await getDashboardData(user.uid);
          setData(fetchedData as DashboardData);
          setError(null);
        } catch (err) {
          console.error("Data fetching error:", err);
          setError("Failed to load dashboard data.");
          setData(null);
        } finally {
          setIsFetching(false);
        }
      } else {
        setData(null);
        setIsFetching(false);
      }
    }

    fetchData();
  }, [user]);

  return { data, error, isFetching };
}