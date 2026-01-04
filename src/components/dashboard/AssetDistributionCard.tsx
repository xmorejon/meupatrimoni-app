import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AssetDistributionCardProps {
  physical: number;
  financial: number;
}

const COLORS = ['#0088FE', '#00C49F'];

export const AssetDistributionCard: FC<AssetDistributionCardProps> = ({ physical, financial }) => {
  const data = [
    { name: 'Físics', value: physical },
    { name: 'Financers', value: financial },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribució d'Actius</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) =>
                new Intl.NumberFormat('ca-ES', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(value)
              }
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
