'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Papa from 'papaparse';
import { useToast } from "@/components/ui/use-toast"
import { batchImport } from '@/lib/firebase-service';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"


const supportedBanks = ['Revolut', 'N26'];

const formSchema = z.object({
  bank: z.string().min(1, { message: 'Si us plau, selecciona un banc.' }),
  file: z.any().refine(file => file instanceof File, 'Si us plau, puja un fitxer.'),
});

export const ImporterClient = () => {
  const [isParsing, setIsParsing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bank: '',
      file: null,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsParsing(true);
    Papa.parse(values.file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          await batchImport(results.data, values.bank);
          toast({
            title: 'Importació exitosa',
            description: `S'han importat ${results.data.length} transaccions.`,
          });
          router.push('/dashboard');
        } catch (error) {
          console.error(error);
          toast({
            variant: "destructive",
            title: 'Error en la importació',
            description: 'Hi ha hagut un problema en importar les teves dades. Si us plau, intenta-ho de nou.',
          });
        } finally {
          setIsParsing(false);
        }
      },
      error: (error) => {
        console.error(error);
        toast({
            variant: "destructive",
            title: 'Error en el processament',
            description: 'Hi ha hagut un problema en processar el teu fitxer CSV. Si us plau, comprova el format i intenta-ho de nou.',
        });
        setIsParsing(false);
      },
    });
  };

  return (
    <Card className="max-w-xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Importar Transaccions</CardTitle>
        <CardDescription>Puja un fitxer CSV del teu banc per importar les teves transaccions.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="bank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banc</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un banc" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {supportedBanks.map(bank => (
                        <SelectItem key={bank} value={bank}>{bank}</SelectItem>
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
              render={({ field: { onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Fitxer CSV</FormLabel>
                  <FormControl>
                    <input 
                      type="file" 
                      accept=".csv"
                      onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isParsing}>{isParsing ? 'Processant...' : 'Importar'}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
