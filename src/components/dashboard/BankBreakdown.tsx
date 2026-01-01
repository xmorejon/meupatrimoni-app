import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BankStatus } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Landmark } from 'lucide-react';

interface BankBreakdownProps {
  banks: BankStatus[];
}

export const BankBreakdown: FC<BankBreakdownProps> = ({ banks }) => {
  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle>Bank Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bank</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.map((bank) => (
              <TableRow key={bank.name}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md">
                        <Landmark className="h-4 w-4 text-muted-foreground"/>
                    </div>
                    <div>
                        <div className="font-medium text-foreground">{bank.name}</div>
                        <div className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(bank.lastUpdated, { addSuffix: true, locale: de })}
                        </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-foreground">
                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(bank.balance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
