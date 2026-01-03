
"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import type { BankStatus, Debt, Asset } from '@/lib/types';

type Item = (BankStatus | Debt | Asset) & { balance?: number; value?: number };

interface BreakdownProps {
  title: string;
  items: Item[];
  type: 'bank' | 'debt' | 'asset';
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const Breakdown: FC<BreakdownProps> = ({ title, items, type }) => {

  const total = items.reduce((acc, item) => {
    if (type === 'asset') return acc + (item.value || 0);
    return acc + (item.balance || 0);
  }, 0);

  const valueAccessor = (item: Item) => type === 'asset' ? item.value : item.balance;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead className="text-right">{type === 'asset' ? 'Valor' : 'Balanç'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell className="text-right">{formatCurrency(valueAccessor(item) || 0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">Total</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(total)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
};
