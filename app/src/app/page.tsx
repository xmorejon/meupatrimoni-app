import { getDashboardData } from "@/lib/firebase-service";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import messages from '@/messages/ca.json';

export default async function Home() {
  const data = await getDashboardData();

  return (
    <DashboardClient 
      initialData={data}
      translations={messages.Dashboard}
    />
  );
}
