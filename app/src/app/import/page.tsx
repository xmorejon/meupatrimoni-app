import { ImporterClient } from "@/components/importer/ImporterClient";
import { getBankBreakdown, getDebtBreakdown, getAssetBreakdown } from "@/lib/firebase-service";
import messages from '@/messages/ca.json';


export default async function ImportPage() {
  const [banks, debts, assets] = await Promise.all([
    getBankBreakdown(),
    getDebtBreakdown(),
    getAssetBreakdown(),
  ]);
  
  return <ImporterClient banks={banks} debts={debts} assets={assets} translations={messages.Dashboard} />;
}
