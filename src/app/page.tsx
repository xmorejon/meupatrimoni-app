import { getDashboardData } from "@/lib/firebase-service";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import messages from '@/messages/ca.json';

export default async function Home() {
  const data = await getDashboardData();
  const translations = {
    dashboard: messages.Dashboard,
    locale: messages.Locale,
    currency: messages.Currency,
  };

  return (
    <DashboardClient 
      initialData={data}
      translations={translations}
    />
  );
}
