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
import type { Debt } from "@/lib/types";
import { ca } from "date-fns/locale";
import type { Locale } from "date-fns";
import { CreditCard, Home, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntryDialog } from "./EntryDialog";
import type { z } from "zod";
import { bankDebtSchema } from "./EntryDialog";
import { TimeAgo } from "./TimeAgo";
import { Badge } from "@/components/ui/badge";

interface DebtBreakdownProps {
  debts: Debt[];
  onEntry: (values: z.infer<typeof bankDebtSchema>, type: "Debt") => void;
}

const localeMap: { [key: string]: Locale } = {
  "ca-ES": ca,
};

const DebtIcon = ({ type }: { type: Debt["type"] }) => {
  switch (type) {
    case "Credit Card":
      return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    case "Mortgage":
      return <Home className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
};

export const DebtBreakdown: FC<DebtBreakdownProps> = ({ debts, onEntry }) => {
  const t = {
    title: "Deutes",
    addDebt: "Afegir Deute",
    debtHeader: "Deute",
    balanceHeader: "Saldo",
    updateTypeHeader: "Tipus d'Actualització",
    automated: "Automatitzat",
    manual: "Manual",
  };
  const debtType = t.debtHeader;
  const tEntry = {
    editTitle: `Editar ${debtType}`,
    addTitle: `Afegir ${debtType}`,
    editDescription: `Actualitza els detalls del teu ${debtType.toLowerCase()}.`,
    addDescription: `Afegeix un nou ${debtType.toLowerCase()} per fer el seguiment.`,
    nameLabel: `Nom del ${debtType}`,
    valueLabel: "{valueFieldLabel}",
    typeLabel: "Tipus",
    saveButton: "Desar Canvis",
    successMessage: `${debtType} '{name}' {action} correctament.`,
    actionUpdated: "actualitzat",
    actionAdded: "afegit",
    bankNamePlaceholder: "Ex: Compte Corrent",
    debtNamePlaceholder: "Ex: Targeta de Crèdit",
    assetNamePlaceholder: "Ex: Casa Principal",
    valuePlaceholder: "€1,234.56",
    selectTypePlaceholder: `Selecciona un tipus de ${debtType.toLowerCase()}`,
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
          type="Debt"
          onEntry={(values) => onEntry(values, "Debt")}
          trigger={
            <Button variant="outline" size="sm">
              {t.addDebt}
            </Button>
          }
          translations={tEntry}
        />
      </CardHeader>
      <CardContent className="flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.debtHeader}</TableHead>
              <TableHead className="text-right">{t.balanceHeader}</TableHead>
              <TableHead>{t.updateTypeHeader}</TableHead>
              <TableHead className="w-[80px] text-center">
                {tEntry.actionsHeader}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.map((debt) => (
              <TableRow key={debt.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md flex-shrink-0">
                      {debt.providerId ? (
                        <img
                          src={`/logos/${debt.providerId}.svg`}
                          alt={debt.name}
                          className="h-4 w-4"
                        />
                      ) : (
                        <DebtIcon type={debt.type} />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {debt.name}
                      </div>
                      <TimeAgo
                        date={debt.lastUpdated as Date}
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
                  }).format(debt.balance)}
                </TableCell>
                <TableCell>
                  <Badge variant={debt.truelayerId ? "success" : "secondary"}>
                    {debt.truelayerId ? t.automated : t.manual}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <EntryDialog
                    type="Debt"
                    onEntry={(values) => onEntry(values, "Debt")}
                    item={debt}
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
