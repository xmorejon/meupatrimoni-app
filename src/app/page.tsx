import { getDashboardData } from "@/lib/mock-data";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getTranslations } from 'next-intl/server';
import { getLocale } from 'next-intl/server';

export default async function Home() {
  const data = getDashboardData();
  const t = await getTranslations();
  const locale = await getLocale();

  return (
    <DashboardClient 
      initialData={data} 
      translations={{
        dashboard: t.raw('Dashboard'),
        locale: t.raw('Locale'),
        currency: t.raw('Currency'),
      }}
      locale={locale}
    />
  );
}
