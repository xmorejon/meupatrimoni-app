import { getDashboardData } from "@/lib/firebase-service";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getLocale } from 'next-intl/server';

export default async function Home() {
  const data = await getDashboardData();
  const locale = await getLocale();

  return (
    <DashboardClient 
      initialData={data}
      locale={locale}
    />
  );
}
