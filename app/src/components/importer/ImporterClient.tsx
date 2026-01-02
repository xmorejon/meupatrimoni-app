
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

const formSchema = z.object({
  entryType: z.enum(["Bank", "Debt", "Asset"]),
  itemId: z.string().min(1, "Please select an item."),
  file: z.instanceof(FileList).refine((files) => files?.length === 1, "A CSV file is required."),
});

type FormValues = z.infer<typeof formSchema>;

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
    translations: any;
}

export function ImporterClient({ banks, debts, assets, translations }: ImporterClientProps) {
  const { toast } } from useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
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
        title: "Import Failed",
        description: "Selected item not found.",
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
             throw new Error(`CSV must have the following columns: ${requiredColumns.join(', ')}`);
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
            throw new Error(`No valid records found in the file. Check 'Date' (DD/MM/YYYY) and '${valueColumn}' columns.`);
          }

          await batchImportEntries(data.entryType, selectedItem, entries);

          toast({
            title: "Import Complete",
            description: `Successfully imported ${entries.length} records for ${selectedItem.name}.`,
          });
          router.push(rootPath);

        } catch (error: any) {
           toast({
            variant: "destructive",
            title: "Import Failed",
            description: error.message || "An unexpected error occurred.",
          });
        } finally {
          setLoading(false);
          form.reset();
        }
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "There was an error parsing the CSV file.",
        });
      },
    });
  };

  const valueColumnName = entryType === 'Asset' ? 'Value' : 'Balance';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header title={translations.title} />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Upload Statement</CardTitle>
              <CardDescription>
                Select an entry type and item, then upload the corresponding CSV file. 
                Ensure your CSV has columns for 'Date' (DD/MM/YYYY) and '{valueColumnName}'.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form { ...form }>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="entryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entry Type</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('itemId', ''); // Reset item selection
                        }} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an entry type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Bank">Bank Account</SelectItem>
                            <SelectItem value="Debt">Debt</SelectItem>
                            <SelectItem value="Asset">Asset</SelectItem>
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
                                <SelectValue placeholder={`Select a ${entryType.toLowerCase()}`} />
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
                        <FormLabel>CSV File</FormLabel>
                        <FormControl>
                          <Input type="file" accept=".csv" { ...form.register("file") } />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading || !form.formState.isValid}>
                      {loading ? "Importing..." : "Import Data"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.push(rootPath)} disabled={loading}>
                      Cancel
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
