"use client";

import React from "react";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import PrivateRoute from "@/components/PrivateRoute";
import { useAuth } from "@/context/AuthContext";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { data, error, isFetching } = useDashboardData(user);

  const isLoading = authLoading || isFetching;

  return (
    <PrivateRoute>
      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div>Error: {error}</div>
      ) : data ? (
        <DashboardClient data={data} />
      ) : user ? (
        <div>No dashboard data available.</div>
      ) : (
        <div>Please log in to view the dashboard.</div>
      )}
    </PrivateRoute>
  );
}
