import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Debt } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { CreditCard, Home } from 'lucide-react';

interface DebtBreakdownProps {
  debts: Debt[];
}

const DebtIcon = ({ type }: { type: Debt['type'] }) => {
    switch (type) {
        case 'Credit Card':
            return <CreditCard className="h-4 w-4 text-muted-foreground"/>;
        case 'Mortgage':
            return <Home className="h-4 w-4 text-muted-foreground"/>;
        default:
            return null;
    }
}

export const DebtBreakdown: FC<DebtBreakdownProps> = ({ debts }) => {
  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle>Debt Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Debt</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.map((debt) => (
              <TableRow key={debt.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md">
                        <DebtIcon type={debt.type} />
                    </div>
                    <div>
                        <div className="font-medium text-foreground">{debt.name}</div>
                        <div className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(debt.lastUpdated, { addSuffix: true, locale: de })}
                        </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-foreground">
                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(debt.balance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
