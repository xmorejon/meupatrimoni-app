import { ImporterClient } from "@/components/importer/ImporterClient";
import { getBankBreakdown } from "@/lib/firebase-service";

export default async function ImportPage() {
  const banks = await getBankBreakdown();

  return <ImporterClient banks={banks} />;
}