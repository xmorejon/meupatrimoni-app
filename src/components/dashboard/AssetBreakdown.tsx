import type { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Asset } from "@/lib/types";
import { ca } from "date-fns/locale";
import type { Locale } from "date-fns";
import { Home, Car, Edit, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntryDialog } from "./EntryDialog";
import type { z } from "zod";
import { assetSchema } from "./EntryDialog";
import { TimeAgo } from "./TimeAgo";
import { Badge } from "@/components/ui/badge";

interface AssetBreakdownProps {
  assets: Asset[];
  onEntry: (values: z.infer<typeof assetSchema>, type: "Asset") => void;
  onHistory: (item: Asset, type: "Asset") => void;
}

const localeMap: { [key: string]: Locale } = {
  "ca-ES": ca,
};

const AssetIcon = ({ type }: { type: Asset["type"] }) => {
  switch (type) {
    case "House":
      return <Home className="h-4 w-4 text-muted-foreground" />;
    case "Car":
      return <Car className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
};

export const AssetBreakdown: FC<AssetBreakdownProps> = ({
  assets,
  onEntry,
  onHistory,
}) => {
  const t = {
    title: "Actius",
    addAsset: "Afegir Actiu",
    assetHeader: "Actiu",
    valueHeader: "Valor",
    updateTypeHeader: "Tipus d'Actualització",
    automated: "Automatitzat",
    manual: "Manual",
  };
  const assetType = t.assetHeader;
  const tEntry = {
    editTitle: `Editar ${assetType}`,
    addTitle: `Afegir ${assetType}`,
    editDescription: `Actualitza els detalls del teu ${assetType.toLowerCase()}.`,
    addDescription: `Afegeix un nou ${assetType.toLowerCase()} per fer el seguiment.`,
    nameLabel: `Nom del ${assetType}`,
    valueLabel: "{valueFieldLabel}",
    typeLabel: "Tipus",
    saveButton: "Desar Canvis",
    successMessage: `${assetType} '{name}' {action} correctament.`,
    actionUpdated: "actualitzat",
    actionAdded: "afegit",
    bankNamePlaceholder: "Ex: Compte Corrent",
    debtNamePlaceholder: "Ex: Targeta de Crèdit",
    assetNamePlaceholder: "Ex: Casa Principal",
    valuePlaceholder: "€1,234.56",
    selectTypePlaceholder: `Selecciona un tipus de ${assetType.toLowerCase()}`,
    actionsHeader: "Accions",
  };
  const locale = "ca-ES";
  const currency = "EUR";
  const currentLocale = localeMap[locale as keyof typeof localeMap] || ca;
  const updatedTranslations = { updated: "Actualitzat fa {time}" };

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.title}</CardTitle>
        <EntryDialog
          type="Asset"
          onEntry={(values) =>
            onEntry(values as z.infer<typeof assetSchema>, "Asset")
          }
          trigger={
            <Button variant="outline" size="sm">
              {t.addAsset}
            </Button>
          }
          translations={tEntry}
        />
      </CardHeader>
      <CardContent className="flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.assetHeader}</TableHead>
              <TableHead className="text-right">{t.valueHeader}</TableHead>
              <TableHead>{t.updateTypeHeader}</TableHead>
              <TableHead className="w-[80px] text-center">
                {tEntry.actionsHeader}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md flex-shrink-0">
                      <AssetIcon type={asset.type} />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {asset.name}
                      </div>
                      <TimeAgo
                        date={asset.lastUpdated as Date}
                        locale={currentLocale}
                        translations={updatedTranslations}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-foreground">
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency,
                  }).format(asset.value)}
                </TableCell>
                <TableCell>
                  <Badge variant={asset.truelayerId ? "success" : "secondary"}>
                    {asset.truelayerId ? t.automated : t.manual}
                  </Badge>
                </TableCell>
                <TableCell className="text-center flex items-center justify-center gap-2">
                  <EntryDialog
                    type="Asset"
                    onEntry={(values) =>
                      onEntry(values as z.infer<typeof assetSchema>, "Asset")
                    }
                    item={asset}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    }
                    translations={tEntry}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onHistory(asset, "Asset")}
                  >
                    <LineChart className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
