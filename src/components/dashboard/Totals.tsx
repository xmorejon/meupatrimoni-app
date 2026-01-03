
"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface TotalsProps {
  totalNetWorth: number;
  netWorthChange: number;
  currentCashFlow: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercentage = (value: number) => {
  return new Intl.NumberFormat('ca-ES', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

export const Totals: FC<TotalsProps> = ({ totalNetWorth, netWorthChange, currentCashFlow }) => {
    const isChangePositive = netWorthChange > 0;
    const isChangeNegative = netWorthChange < 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Patrimoni Net Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalNetWorth)}</div>
          <div className={`text-xs text-muted-foreground flex items-center ${isChangePositive ? 'text-green-600' : isChangeNegative ? 'text-red-600' : ''}`}>
            {isChangePositive && <ArrowUp className="h-4 w-4 mr-1" />}
            {isChangeNegative && <ArrowDown className="h-4 w-4 mr-1" />}
            {formatPercentage(netWorthChange)} des d'ahir
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Flow Actual</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentCashFlow)}</div>
            <p className="text-xs text-muted-foreground">Actius financers menys deutes de targeta de crèdit</p>
        </CardContent>
      </Card>
    </div>
  );
};
