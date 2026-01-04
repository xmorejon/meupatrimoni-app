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
import type { Bank, Debt, Asset } from '@/lib/types';


const formSchema = z.object({
  importType: z.string().min(1, { message: "Si us plau, selecciona un tipus d'importació." }),
  entityId: z.string().min(1, { message: 'Si us plau, selecciona una entitat.' }),
  file: z.any().refine(file => file instanceof File, 'Si us plau, puja un fitxer.'),
});

interface ImporterClientProps {
  banks: Bank[];
  debts: Debt[];
  assets: Asset[];
}

export const ImporterClient: React.FC<ImporterClientProps> = ({ banks, debts, assets }) => {
  const [isParsing, setIsParsing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      importType: '',
      entityId: '',
      file: null,
    },
  });

  const importType = form.watch('importType');

  const getEntitiesForType = () => {
    switch (importType) {
      case 'Bank':
        return banks;
      case 'Debt':
        return debts;
      case 'Asset':
        return assets;
      default:
        return [];
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsParsing(true);
    Papa.parse(values.file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          await batchImport(results.data, values.importType, values.entityId);
          toast({
            title: 'Importació exitosa',
            description: `S'han importat ${results.data.length} registres.`,
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
        <CardTitle>Importar Dades</CardTitle>
        <CardDescription>Puja un fitxer CSV per importar les teves dades financeres.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="importType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipus d'Importació</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipus" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Bank">Bancs</SelectItem>
                      <SelectItem value="Debt">Deutes</SelectItem>
                      <SelectItem value="Asset">Actius</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {importType && (
              <FormField
                control={form.control}
                name="entityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entitat Específica</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={`Selecciona un ${importType.toLowerCase()}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getEntitiesForType().map(entity => (
                          <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
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
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel·lar
              </Button>
              <Button type="submit" disabled={isParsing}>
                {isParsing ? 'Processant...' : 'Importar'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
