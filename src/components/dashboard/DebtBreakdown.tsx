import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Debt } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { CreditCard, Home, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntryDialog } from './EntryDialog';
import type { z } from 'zod';
import type { entrySchema } from './EntryDialog';


interface DebtBreakdownProps {
  debts: Debt[];
  onEntry: (values: z.infer<typeof entrySchema>, type: 'Debt') => void;
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

export const DebtBreakdown: FC<DebtBreakdownProps> = ({ debts, onEntry }) => {
  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Debt Breakdown</CardTitle>
        <EntryDialog
            type="Debt"
            onEntry={(values) => onEntry(values, 'Debt')}
            trigger={<Button variant="outline" size="sm">Add Debt</Button>}
        />
      </CardHeader>
      <CardContent className="flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Debt</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-[80px] text-center">Actions</TableHead>
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
                <TableCell className="text-center">
                    <EntryDialog
                        type="Debt"
                        onEntry={(values) => onEntry(values, 'Debt')}
                        item={debt}
                        trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                            </Button>
                        }
                    />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
