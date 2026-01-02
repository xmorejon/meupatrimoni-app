"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Papa from "papaparse";
import { useRouter } from "next/navigation";

import type { BankStatus } from "@/lib/types";
import { batchImportBalanceEntries } from "@/lib/firebase-service";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  bankId: z.string().min(1, "Please select a bank."),
  file: z.instanceof(FileList).refine((files) => files?.length === 1, "A CSV file is required."),
});

type FormValues = z.infer<typeof formSchema>;

interface CsvData {
    Date: string;
    Balance: string;
    [key: string]: string;
}

export function ImporterClient({ banks }: { banks: BankStatus[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: FormValues) => {
    setLoading(true);
    const file = data.file[0];
    const selectedBank = banks.find(b => b.id === data.bankId);

    if (!selectedBank) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: "Selected bank not found.",
      });
      setLoading(false);
      return;
    }
    
    Papa.parse<CsvData>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const requiredColumns = ['Date', 'Balance'];
          if (!results.meta.fields || !requiredColumns.every(col => results.meta.fields?.includes(col))) {
             throw new Error(`CSV must have the following columns: ${requiredColumns.join(', ')}`);
          }

          const entries = results.data.map(row => ({
            timestamp: new Date(row.Date),
            balance: parseFloat(row.Balance),
          })).filter(entry => !isNaN(entry.timestamp.getTime()) && !isNaN(entry.balance));

          if (entries.length === 0) {
            throw new Error("No valid records found in the file. Check 'Date' and 'Balance' columns.");
          }

          await batchImportBalanceEntries(selectedBank, entries);

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
      <Header title="Import Bank Movements" />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Upload Statement</CardTitle>
              <CardDescription>
                Select a bank and upload the corresponding CSV file of movements. 
                Ensure your CSV has columns for 'Date' and 'Balance'.
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
                    <Button type="submit" disabled={loading}>
                      {loading ? "Importing..." : "Import Movements"}
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
