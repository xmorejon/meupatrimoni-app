import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BankStatus } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Landmark, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntryDialog } from './EntryDialog';
import type { z } from 'zod';
import type { entrySchema } from './EntryDialog';

interface BankBreakdownProps {
  banks: BankStatus[];
  onEntry: (values: z.infer<typeof entrySchema>, type: 'Bank') => void;
}

export const BankBreakdown: FC<BankBreakdownProps> = ({ banks, onEntry }) => {
  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Bank Breakdown</CardTitle>
        <EntryDialog 
            type="Bank" 
            onEntry={(values) => onEntry(values, 'Bank')}
            trigger={<Button variant="outline" size="sm">Add Bank</Button>}
        />
      </CardHeader>
      <CardContent className="flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bank</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-[80px] text-center">Actions</TableHead>
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
                <TableCell className="text-center">
                    <EntryDialog 
                        type="Bank" 
                        onEntry={(values) => onEntry(values, 'Bank')}
                        item={bank}
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
