import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface TotalsProps {
    totalNetWorth: number;
    netWorthChange: number;
    currentCashFlow: number;
}

export const Totals: FC<TotalsProps> = ({ totalNetWorth, netWorthChange, currentCashFlow }) => {
    const netWorthChangePercentage = totalNetWorth > 0 ? (netWorthChange / (totalNetWorth - netWorthChange)) * 100 : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patrimoni Net</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(totalNetWorth)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
                {netWorthChange >= 0 ? <ArrowUp className="h-4 w-4 text-green-500" /> : <ArrowDown className="h-4 w-4 text-red-500" />}
                <span className={`${netWorthChange >= 0 ? 'text-green-500' : 'text-red-500'} font-semibold ml-1`}>
                    {netWorthChangePercentage.toFixed(2)}%
                </span>
                <span className="ml-2">vs el mes passat</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flux de Caixa</CardTitle>
            <span className="text-2xl">💸</span>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${currentCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(currentCashFlow)}
            </div>
            <p className="text-xs text-muted-foreground">+€2,350 en ingressos aquest mes</p>
          </CardContent>
        </Card>
      </div>
    );
}