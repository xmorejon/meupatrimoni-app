import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Debt } from '@/lib/types';

interface DebtBreakdownCardProps {
  debts: Debt[];
}

export const DebtBreakdownCard: FC<DebtBreakdownCardProps> = ({ debts }) => {
  const debtTypeTotals = debts.reduce((acc, debt) => {
    if (!acc[debt.type]) {
      acc[debt.type] = 0;
    }
    acc[debt.type] += debt.balance;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(debtTypeTotals).map(([name, value]) => ({ name, value }));

  const translations = {
    title: "Desglossament de Deutes",
    'Credit Card': "Targeta de Crèdit",
    'Loan': "Préstec",
    'Mortgage': "Hipoteca",
    'Other': "Altres",
  };

  const translatedData = data.map(item => ({
    ...item,
    name: translations[item.name as keyof typeof translations] || item.name,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={translatedData} layout="vertical">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(value: number) =>
                new Intl.NumberFormat('ca-ES', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(value)
              }
              cursor={{ fill: 'transparent' }}
            />
            <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
