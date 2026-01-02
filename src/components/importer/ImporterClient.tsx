"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Papa from "papaparse";

import type { BankStatus } from "@/lib/types";
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

export function ImporterClient({ banks }: { banks: BankStatus[] }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: FormValues) => {
    setLoading(true);
    const file = data.file[0];
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Here we will process the results and save to Firebase
        console.log("Parsed CSV data:", results.data);

        // TODO: Implement batch save to Firestore
        
        setLoading(false);
        toast({
          title: "Import Complete",
          description: `Processed ${results.data.length} records.`,
        });
        form.reset();
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
                  <Button type="submit" disabled={loading}>
                    {loading ? "Importing..." : "Import Movements"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
