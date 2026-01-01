import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus, Wallet } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface NetWorthCardProps {
  totalNetWorth: number;
  change: number;
  cashFlow: number;
  translations: any;
  locale: string;
  currency: string;
}

export const NetWorthCard: FC<NetWorthCardProps> = ({ totalNetWorth, change, cashFlow, translations, locale, currency }) => {
  const formattedNetWorth = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(totalNetWorth);

  const formattedCashFlow = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(cashFlow);

  const ChangeIcon = change > 0.01 ? ArrowUpRight : change < -0.01 ? ArrowDownRight : Minus;
  const changeColor = change > 0.01 ? 'text-green-400' : change < -0.01 ? 'text-red-400' : 'text-muted-foreground';

  return (
    <Card className="shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-3">
        <div className="md:col-span-2 p-6">
          <CardTitle className="text-muted-foreground font-medium">{translations.totalNetWorth}</CardTitle>
          <div className="flex items-baseline gap-4 mt-2">
            <p className="text-4xl md:text-5xl font-bold text-foreground">
              {formattedNetWorth}
            </p>
            <div className={`flex items-center gap-1 text-lg font-semibold ${changeColor}`}>
              <ChangeIcon className="h-5 w-5" />
              <span>{change.toFixed(2)}%</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{translations.vsYesterday}</p>
        </div>
        <div className="p-6 flex flex-col justify-center border-t md:border-t-0 md:border-l border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-md">
                <Wallet className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{translations.currentCashFlow}</p>
              <p className="text-xl font-bold text-foreground">{formattedCashFlow}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{translations.cashFlowDescription}</p>
        </div>
      </div>
    </Card>
  );
};
