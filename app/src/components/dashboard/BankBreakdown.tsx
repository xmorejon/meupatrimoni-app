
import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BankStatus } from '@/lib/types';
import { ca } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { Landmark, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntryDialog } from './EntryDialog';
import type { z } from 'zod';
import type { entrySchema } from './EntryDialog';
import { TimeAgo } from './TimeAgo';
import messages from '@/messages/ca.json';

interface BankBreakdownProps {
  banks: BankStatus[];
  onEntry: (values: z.infer<typeof entrySchema>, type: 'Bank') => void;
}

const localeMap: { [key: string]: Locale } = {
  'ca-ES': ca,
};

export const BankBreakdown: FC<BankBreakdownProps> = ({ banks, onEntry }) => {
  const translations = messages.Dashboard;
  const t = translations.bankBreakdown;
  const tEntry = translations.entryDialog;
  const locale = 'ca-ES';
  const currency = 'EUR';
  const currentLocale = localeMap[locale as keyof typeof localeMap] || ca;
  
  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.title}</CardTitle>
        <EntryDialog 
            type="Bank" 
            onEntry={(values) => onEntry(values, 'Bank')}
            trigger={<Button variant="outline" size="sm">{t.addBank}</Button>}
            translations={tEntry}
        />
      </CardHeader>
      <CardContent className="flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.bankHeader}</TableHead>
              <TableHead className="text-right">{t.balanceHeader}</TableHead>
              <TableHead className="w-[80px] text-center">{tEntry.actionsHeader}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.map((bank) => (
              <TableRow key={bank.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md">
                        <Landmark className="h-4 w-4 text-muted-foreground"/>
                    </div>
                    <div>
                        <div className="font-medium text-foreground">{bank.name}</div>
                        <TimeAgo date={bank.lastUpdated as Date} locale={currentLocale} translations={{ updated: translations.updated }}/>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-foreground">
                  {new Intl.NumberFormat(locale, { style: 'currency', currency }).format(bank.balance)}
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
                        translations={tEntry}
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
