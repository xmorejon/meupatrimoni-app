import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BankStatus } from '@/lib/types';

interface BankBreakdownCardProps {
  banks: BankStatus[];
}

export const BankBreakdownCard: FC<BankBreakdownCardProps> = ({ banks }) => {
  const sortedBanks = [...banks].sort((a, b) => b.balance - a.balance);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desglossament Bancari</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedBanks.map(bank => (
            <div key={bank.id} className="flex justify-between items-center">
              <span>{bank.name}</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('ca-ES', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(bank.balance)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
