
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Papa from "papaparse";
import { useRouter } from "next/navigation";

import { getBankBreakdown } from "@/lib/firebase-service";
import { batchImportEntries } from "@/lib/firebase-service";
import type { BankStatus } from "@/lib/types";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  bankId: z.string().min(1, "Please select a bank account."),
  file: z.instanceof(FileList).refine((files) => files?.length === 1, "A CSV file is required."),
});

type FormValues = z.infer<typeof formSchema>;

interface CsvData {
  Date: string;
  Balance: string;
}

interface ImportPageProps {
  banks: BankStatus[];
}

function ImporterClient({ banks }: ImportPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bankId: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    setLoading(true);
    const file = data.file[0];
    const selectedBank = banks.find(b => b.id === data.bankId);
    
    if (!selectedBank) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: "Selected bank account not found.",
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
          if (!results.meta.fields || !results.meta.fields.includes('Date') || !results.meta.fields.includes('Balance')) {
             throw new Error("CSV must have 'Date' and 'Balance' columns.");
          }

          const entries = results.data.map(row => {
            if (!row.Date || !row.Balance) return null;
            
            const dateParts = row.Date.split('/');
            if (dateParts.length !== 3) return null;
            
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const year = parseInt(dateParts[2], 10);
            
            return {
              timestamp: new Date(year, month, day),
              balance: parseFloat(row.Balance.replace(/\./g, '').replace(',', '.')),
            }
          }).filter((entry): entry is { timestamp: Date; balance: number; } => 
              entry !== null && !isNaN(entry.timestamp.getTime()) && !isNaN(entry.balance)
          );

          if (entries.length === 0) {
            throw new Error("No valid records found in the file. Check 'Date' (DD/MM/YYYY) and 'Balance' columns.");
          }

          await batchImportEntries(selectedBank, entries);

          toast({
            title: "Import Complete",
            description: `Successfully imported ${entries.length} records for ${selectedBank.name}.`,
          });
          router.push('/');

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

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header title="Import Historical Data" />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Upload Bank Statement</CardTitle>
              <CardDescription>
                Select a bank account and upload the corresponding CSV file. 
                Ensure your CSV has columns for 'Date' (DD/MM/YYYY) and 'Balance'.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="bankId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Account</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a bank account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {banks.map((bank) => (
                              <SelectItem key={bank.id} value={bank.id}>
                                {bank.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="file"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CSV File</FormLabel>
                        <FormControl>
                          <Input type="file" accept=".csv" {...form.register("file")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading || !form.formState.isValid}>
                      {loading ? "Importing..." : "Import Data"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.push('/')} disabled={loading}>
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


export default async function ImportPage() {
  const banks = await getBankBreakdown();
  return <ImporterClient banks={banks} />;
}
