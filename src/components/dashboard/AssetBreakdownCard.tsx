import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Asset } from '@/lib/types';

interface AssetBreakdownCardProps {
  assets: Asset[];
}

export const AssetBreakdownCard: FC<AssetBreakdownCardProps> = ({ assets }) => {
  const sortedAssets = [...assets].sort((a, b) => b.value - a.value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desglossament d'Actius</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedAssets.map(asset => (
            <div key={asset.id} className="flex justify-between items-center">
              <span>{asset.name}</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('ca-ES', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(asset.value)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
