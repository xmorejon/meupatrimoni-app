import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus, Wallet } from 'lucide-react';

interface NetWorthCardProps {
  totalNetWorth: number;
  change: number;
  cashFlow: number;
}

export const NetWorthCard: FC<NetWorthCardProps> = ({ totalNetWorth, change, cashFlow }) => {
  const translations = {
    totalNetWorth: "Patrimoni Net Total",
    vsYesterday: "respecte ahir",
    currentCashFlow: "Capital Disponible",
    cashFlowDescription: "Actius líquids menys deutes de targeta de crèdit.",
  };
  const locale = 'ca-ES';
  const currency = 'EUR';

  const formattedNetWorth = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(totalNetWorth);

  const formattedCashFlow = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(cashFlow);

  const ChangeIcon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  const changeColor = change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations.totalNetWorth}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{formattedNetWorth}</div>
        <div className="flex items-center text-sm mt-1">
          <ChangeIcon className={`h-4 w-4 ${changeColor}`} />
          <span className={`${changeColor} font-semibold`}>
            {change.toFixed(2)}%
          </span>
          <span className="text-xs text-muted-foreground ml-1">{translations.vsYesterday}</span>
        </div>
        <div className="border-t border-border mt-4 pt-4">
          <div className="flex items-center">
            <div className="p-2 bg-muted rounded-md mr-3">
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{translations.currentCashFlow}</p>
              <p className="text-xl font-bold text-foreground">{formattedCashFlow}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{translations.cashFlowDescription}</p>
        </div>
      </CardContent>
    </Card>
  );
};
