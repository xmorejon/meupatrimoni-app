import { getDashboardData } from "@/lib/mock-data";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getLocale } from 'next-intl/server';

export default async function Home() {
  const data = getDashboardData();
  const locale = await getLocale();

  return (
    <DashboardClient 
      initialData={data}
      locale={locale}
    />
  );
}