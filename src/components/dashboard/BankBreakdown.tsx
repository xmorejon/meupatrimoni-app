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
import type { Bank } from "@/lib/types";
import { ca } from "date-fns/locale";
import type { Locale } from "date-fns";
import { Landmark, Edit, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntryDialog } from "./EntryDialog";
import type { z } from "zod";
import { bankDebtSchema } from "./EntryDialog";
import { TimeAgo } from "./TimeAgo";
import { Badge } from "@/components/ui/badge";

interface BankBreakdownProps {
  banks: Bank[];
  onEntry: (
    values: z.infer<typeof bankDebtSchema>,
    type: "Bank",
  ) => Promise<void> | void;
  onHistory: (item: Bank, type: "Bank") => void;
}

const localeMap: { [key: string]: Locale } = {
  "ca-ES": ca,
};

export const BankBreakdown: FC<BankBreakdownProps> = ({
  banks,
  onEntry,
  onHistory,
}) => {
  const t = {
    title: "Comptes Bancaris",
    addBank: "Afegir Compte",
    bankHeader: "Compte",
    balanceHeader: "Saldo",
    updateTypeHeader: "Tipus d'Actualització",
    automated: "Auto",
    manual: "Manual",
    email: "Email",
  };
  const bankType = t.bankHeader;
  const tEntry = {
    editTitle: `Editar ${bankType}`,
    addTitle: `Afegir ${bankType}`,
    editDescription: `Actualitza els detalls del teu ${bankType.toLowerCase()}.`,
    addDescription: `Afegeix un nou ${bankType.toLowerCase()} per fer el seguiment.`,
    nameLabel: `Nom del ${bankType}`,
    valueLabel: "{valueFieldLabel}",
    typeLabel: "Tipus",
    saveButton: "Desar Canvis",
    successMessage: `${bankType} '{name}' {action} correctament.`,
    actionUpdated: "actualitzat",
    actionAdded: "afegit",
    bankNamePlaceholder: "Ex: Compte Corrent",
    debtNamePlaceholder: "Ex: Targeta de Crèdit",
    assetNamePlaceholder: "Ex: Casa Principal",
    valuePlaceholder: "€1,234.56",
    selectTypePlaceholder: `Selecciona un tipus de ${bankType.toLowerCase()}`,
    actionsHeader: "Accions",
  };
  const locale = "ca-ES";
  const currency = "EUR";
  const currentLocale = localeMap[locale as keyof typeof localeMap] || ca;
  const updatedTranslations = { updated: "Actualitzat fa {time}" };

  // Sort banks by name in reverse order
  const sortedBanks = [...banks].sort((a, b) =>
    b.name.localeCompare(a.name, locale ?? "ca-ES", { sensitivity: "base" }),
  );

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between px-2">
        <CardTitle>{t.title}</CardTitle>
        <EntryDialog
          type="Bank"
          onEntry={(values) =>
            onEntry(values as z.infer<typeof bankDebtSchema>, "Bank")
          }
          trigger={
            <Button variant="outline" size="sm">
              {t.addBank}
            </Button>
          }
          translations={tEntry}
        />
      </CardHeader>
      <CardContent className="flex-grow px-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.bankHeader}</TableHead>
              <TableHead className="text-right">{t.balanceHeader}</TableHead>
              <TableHead className="w-[80px] text-center">
                {tEntry.actionsHeader}
              </TableHead>
              <TableHead>{t.updateTypeHeader}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBanks.map((bank) => (
              <TableRow key={bank.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-md flex-shrink-0 cursor-pointer ${
                        bank.providerId ? "bg-white" : "bg-muted"
                      }`}
                      onClick={() => onHistory(bank, "Bank")}
                    >
                      {bank.providerId ? (
                        <img
                          src={`/logos/${bank.providerId}.svg`}
                          alt={bank.name}
                          className="h-4 w-4"
                        />
                      ) : (
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {bank.name}
                      </div>
                      <TimeAgo
                        date={bank.lastUpdated as Date}
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
                  }).format(bank.balance)}
                </TableCell>
                <TableCell className="text-justify items-baseline justify-self-auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onHistory(bank, "Bank")}
                  >
                    <LineChart className="h-4 w-4" />
                  </Button>
                  <EntryDialog
                    type="Bank"
                    onEntry={(values) =>
                      onEntry(values as z.infer<typeof bankDebtSchema>, "Bank")
                    }
                    item={bank}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    }
                    translations={tEntry}
                  />
                </TableCell>
                <TableCell>
                  <Badge
                    variant={bank.truelayerId ? "success" : "secondary"}
                    className={
                      (bank as any).emailAutomated && !bank.truelayerId
                        ? "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200"
                        : ""
                    }
                  >
                    {bank.truelayerId
                      ? t.automated
                      : (bank as any).emailAutomated
                        ? t.email
                        : t.manual}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
