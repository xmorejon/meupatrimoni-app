import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface NetWorthCardProps {
  totalNetWorth: number;
  change: number;
}

export const NetWorthCard: FC<NetWorthCardProps> = ({ totalNetWorth, change }) => {
  const formattedNetWorth = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(totalNetWorth);

  const ChangeIcon = change > 0.01 ? ArrowUpRight : change < -0.01 ? ArrowDownRight : Minus;
  const changeColor = change > 0.01 ? 'text-green-400' : change < -0.01 ? 'text-red-400' : 'text-muted-foreground';

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium">Total Net Worth</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-4">
          <p className="text-4xl md:text-5xl font-bold text-foreground">
            {formattedNetWorth}
          </p>
          <div className={`flex items-center gap-1 text-lg font-semibold ${changeColor}`}>
            <ChangeIcon className="h-5 w-5" />
            <span>{change.toFixed(2)}%</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">vs. yesterday</p>
      </CardContent>
    </Card>
  );
};
