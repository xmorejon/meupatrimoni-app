'use client';

import type { FC, ReactNode } from 'react';
import { useState } from 'react';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Entry } from '@/lib/types';

export const baseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: "El nom ha de tenir almenys 2 caràcters." }),
  type: z.string().min(1, { message: "Si us plau, selecciona un tipus." }),
});

const typeTranslations: { [key: string]: string } = {
  'House': 'Casa',
  'Car': 'Cotxe',
  'Current Account': 'Compte Corrent',
  'Investment Account': 'Compte d\'Inversió',
  'Credit Card': 'Targeta de Crèdit',
  'Mortgage': 'Hipoteca',
  'Personal Loan': 'Crèdit Personal',
};

const reverseTypeTranslations: { [key: string]: string } = Object.fromEntries(
  Object.entries(typeTranslations).map(([key, value]) => [value, key])
);

interface EntryDialogProps {
  type: 'Bank' | 'Debt' | 'Asset';
  onEntry: (values: z.infer<typeof baseSchema> & { balance?: number; value?: number; }) => void;
  trigger: ReactNode;
  item?: Entry;
  translations: any;
}

const typeOptions = {
    'Bank': ['Compte Corrent', 'Compte d\'Inversió'],
    'Debt': ['Targeta de Crèdit', 'Hipoteca', 'Crèdit Personal'],
    'Asset': ['Casa', 'Cotxe']
}

const valueFieldLabel = {
    'Bank': 'Balanç',
    'Debt': 'Balanç',
    'Asset': 'Valor'
}

export const EntryDialog: FC<EntryDialogProps> = ({ type, onEntry, trigger, item, translations }) => {
  const [open, setOpen] = useState(false);
  const isEditing = !!item;
  
  const valueFieldName = type === 'Asset' ? 'value' : 'balance';

  const formSchema = baseSchema.extend({
    [valueFieldName]: z.coerce // Use coerce to automatically handle string-to-number conversion
      .number({
        invalid_type_error: "El valor ha de ser un número.",
      })
      .nonnegative({ message: "El valor no pot ser negatiu." }), // Allow 0 and positive numbers
  });

  const translatedType = item?.type ? typeTranslations[item.type] || item.type : (type === 'Bank' ? 'Compte Corrent' : '');
  
  // Sanitize the initial value from the database.
  // If the value from the item is not a finite number (i.e., it is NaN, null, or undefined), default to 0.
  const initialValue = (item as any)?.balance ?? (item as any)?.value;
  const defaultNumericValue = Number.isFinite(initialValue) ? initialValue : 0;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: item?.id,
      name: item?.name ?? "",
      [valueFieldName]: defaultNumericValue,
      type: translatedType,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const submissionValues = {
      ...values,
      type: reverseTypeTranslations[values.type] || values.type,
    };
    onEntry(submissionValues as any);
    form.reset();
    setOpen(false);
  }
  
  const getPlaceholder = (type: 'Bank' | 'Debt' | 'Asset') => {
      switch(type) {
          case 'Bank': return translations.bankNamePlaceholder;
          case 'Debt': return translations.debtNamePlaceholder;
          case 'Asset': return translations.assetNamePlaceholder;
          default: return '';
      }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{(isEditing ? translations.editTitle : translations.addTitle).replace('{type}', type)}</DialogTitle>
          <DialogDescription>
            {(isEditing ? translations.editDescription : translations.addDescription).replace('{type}', type.toLowerCase())}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{translations.nameLabel.replace('{type}', type)}</FormLabel>
                  <FormControl>
                    <Input placeholder={getPlaceholder(type)} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={valueFieldName}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{translations.valueLabel.replace('{valueFieldLabel}', valueFieldLabel[type])}</FormLabel>
                  <FormControl>
                    <Input 
                        type="number"
                        step="0.01"
                        placeholder={translations.valuePlaceholder} 
                        {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{translations.typeLabel}</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v)} defaultValue={String(field.value ?? '')} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={translations.selectTypePlaceholder.replace('{type}', type.toLowerCase())} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {typeOptions[type].map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{translations.saveButton}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};