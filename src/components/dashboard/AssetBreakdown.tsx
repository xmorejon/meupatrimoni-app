import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Asset } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Home, Car, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntryDialog } from './EntryDialog';
import type { z } from 'zod';
import type { entrySchema } from './EntryDialog';

interface AssetBreakdownProps {
  assets: Asset[];
  onEntry: (values: z.infer<typeof entrySchema>, type: 'Asset') => void;
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

export const AssetBreakdown: FC<AssetBreakdownProps> = ({ assets, onEntry }) => {
  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Asset Breakdown</CardTitle>
        <EntryDialog 
            type="Asset" 
            onEntry={(values) => onEntry(values, 'Asset')}
            trigger={<Button variant="outline" size="sm">Add Asset</Button>}
        />
      </CardHeader>
      <CardContent className="flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="w-[80px] text-center">Actions</TableHead>
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
                <TableCell className="text-center">
                    <EntryDialog 
                        type="Asset" 
                        onEntry={(values) => onEntry(values, 'Asset')}
                        item={asset}
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
