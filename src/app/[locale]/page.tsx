import { getDashboardData } from "@/lib/firebase-service";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { unstable_setRequestLocale } from 'next-intl/server';

export default async function Home({
  params: {locale}
}: {
  params: {locale: string};
}) {
  unstable_setRequestLocale(locale);
  const data = await getDashboardData();

  return (
    <DashboardClient 
      initialData={data}
      locale={locale}
    />
  );
}
