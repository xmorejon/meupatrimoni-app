import { getDashboardData } from "@/lib/firebase-service";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { unstable_setRequestLocale } from 'next-intl/server';

export default async function Home({
  params
}: {
  params: {locale: string};
}) {
  unstable_setRequestLocale(params.locale);
  const data = await getDashboardData();

  return (
    <DashboardClient 
      initialData={data}
      locale={params.locale}
    />
  );
}
