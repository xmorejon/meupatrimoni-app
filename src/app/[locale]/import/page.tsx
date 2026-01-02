import { ImporterClient } from "@/components/importer/ImporterClient";
import { getBankBreakdown, getDebtBreakdown, getAssetBreakdown } from "@/lib/firebase-service";
import {locales} from '../../../middleware';
import { unstable_setRequestLocale } from 'next-intl/server';

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default async function ImportPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const [banks, debts, assets] = await Promise.all([
    getBankBreakdown(),
    getDebtBreakdown(),
    getAssetBreakdown(),
  ]);
  
  return <ImporterClient banks={banks} debts={debts} assets={assets} locale={locale} />;
}
