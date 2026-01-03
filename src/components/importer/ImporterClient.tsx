"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Papa from "papaparse";
import { useRouter } from "next/navigation";

import type { BankStatus, Debt, Asset } from "@/lib/types";
import { batchImportEntries } from "@/lib/firebase-service";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CsvData {
    Date: string;
    Balance?: string;
    Value?: string;
    [key: string]: string | undefined;
}

interface ImporterClientProps {
    banks: BankStatus[];
    debts: Debt[];
    assets: Asset[];
}

export function ImporterClient({ banks, debts, assets }: ImporterClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const formSchema = z.object({
    entryType: z.enum(["Bank", "Debt", "Asset"]),
    itemId: z.string().min(1, "Si us plau, selecciona un element."),
    file: z.instanceof(FileList).refine((files) => files?.length === 1, "Es requereix un fitxer CSV."),
  });

  type FormValues = z.infer<typeof formSchema>;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const entryType = form.watch("entryType");

  const itemsForType = {
    Bank: banks,
    Debt: debts,
    Asset: assets,
  };

  const currentItems = entryType ? itemsForType[entryType] : [];
  const rootPath = `/`;

  const onSubmit = (data: FormValues) => {
    setLoading(true);
    const file = data.file[0];
    const selectedItem = (itemsForType[data.entryType] as any[]).find(i => i.id === data.itemId);
    
    if (!selectedItem) {
      toast({
        variant: "destructive",
        title: "Error d'Importació",
        description: "No s'ha trobat l'element seleccionat.",
      });
      setLoading(false);
      return;
    }
    
    Papa.parse<CsvData>(file, {
      header: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', ';'],
      complete: async (results) => {
        try {
          const isAsset = data.entryType === 'Asset';
          const valueColumn = isAsset ? 'Value' : 'Balance';
          const requiredColumns = ['Date', valueColumn];

          if (!results.meta.fields || !requiredColumns.every(col => results.meta.fields?.includes(col))) {
             throw new Error(`El CSV ha de tenir les columnes següents: ${requiredColumns.join(', ')}`);
          }

          const entries = results.data.map(row => {
            const valueString = row[valueColumn];
            if (!row.Date || !valueString) return null;
            
            const dateParts = row.Date.split('/');
            if (dateParts.length !== 3) return null;
            
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const year = parseInt(dateParts[2], 10);

            const valueAsNumber = parseFloat(valueString.replace(/\./g, '').replace(',', '.'));

            if(isAsset) {
                return {
                  timestamp: new Date(year, month, day),
                  value: valueAsNumber,
                }
            }
            return {
              timestamp: new Date(year, month, day),
              balance: valueAsNumber,
            }
          }).filter((entry): entry is { timestamp: Date; balance?: number; value?: number; } => 
              entry !== null && 
              !isNaN(entry.timestamp.getTime()) && 
              (!isNaN(entry.balance ?? NaN) || !isNaN(entry.value ?? NaN))
          );

          if (entries.length === 0) {
            throw new Error(`No s'han trobat registres vàlids. Comprova les columnes 'Data' (DD/MM/YYYY) i '${valueColumn}'.`);
          }

          await batchImportEntries(data.entryType, selectedItem, entries);

          toast({
            title: "Importació Completada",
            description: `S'han importat ${entries.length} registres per a ${selectedItem.name} correctament.`,
          });
          router.push(rootPath);

        } catch (error: any) {
           toast({
            variant: "destructive",
            title: "Error d'Importació",
            description: error.message || "Ha ocorregut un error inesperat.",
          });
        } finally {
          setLoading(false);
          form.reset();
        }
      },
      error: (error) => {
        console.error("Error en processar el CSV:", error);
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Error d'Importació",
          description: "Error en processar el fitxer CSV.",
        });
      },
    });
  };

  const valueColumnName = entryType === 'Asset' ? 'Valor' : 'Balanç';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header title="Importar Dades" />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Pujar Extracte</CardTitle>
              <CardDescription>
                {`Selecciona un tipus d'entrada i un element, després puja el fitxer CSV corresponent. Assegura't que el teu CSV tingui columnes per a 'Data' (DD/MM/YYYY) i '${valueColumnName}'.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="entryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipus d'Entrada</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('itemId', ''); // Reset item selection
                        }} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un tipus d'entrada" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Bank">Compte Bancari</SelectItem>
                            <SelectItem value="Debt">Deute</SelectItem>
                            <SelectItem value="Asset">Actiu</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {entryType && (
                    <FormField
                      control={form.control}
                      name="itemId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{entryType}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={`Selecciona un/a ${entryType.toLowerCase()}`} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {currentItems.map((item: any) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="file"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fitxer CSV</FormLabel>
                        <FormControl>
                          <Input type="file" accept=".csv" {...form.register("file")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading || !form.formState.isValid}>
                      {loading ? "Important..." : "Importar Dades"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.push(rootPath)} disabled={loading}>
                      Cancel·lar
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
