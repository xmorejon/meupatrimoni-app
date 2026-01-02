
import { getDashboardData } from "@/lib/firebase-service";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function Home() {
  const data = await getDashboardData();

  return (
    <DashboardClient 
      initialData={data}
    />
  );
}
