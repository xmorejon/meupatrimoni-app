import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Asset } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Home, Car } from 'lucide-react';

interface AssetBreakdownProps {
  assets: Asset[];
}

const AssetIcon = ({ type }: { type: Asset['type'] }) => {
    switch (type) {
        case 'House':
            return <Home className="h-4 w-4 text-muted-foreground"/>;
        case 'Car':
            return <Car className="h-4 w-4 text-muted-foreground"/>;
        default:
            return null;
    }
}

export const AssetBreakdown: FC<AssetBreakdownProps> = ({ assets }) => {
  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle>Asset Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md">
                        <AssetIcon type={asset.type} />
                    </div>
                    <div>
                        <div className="font-medium text-foreground">{asset.name}</div>
                        <div className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(asset.lastUpdated, { addSuffix: true, locale: de })}
                        </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-foreground">
                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(asset.value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};