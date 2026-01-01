"use client";

import type { FC, ReactNode } from 'react';
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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Entry } from '@/lib/types';


export const baseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  type: z.string().min(1, { message: "Please select a type." }),
});

export const entrySchema = baseSchema.extend({
  balance: z.coerce.number().positive({ message: "Value must be a positive number." }).optional(),
  value: z.coerce.number().positive({ message: "Value must be a positive number." }).optional(),
}).refine(data => (data.balance !== undefined && data.balance > 0) || (data.value !== undefined && data.value > 0), {
    message: "A positive balance or value is required.",
    path: ['balance'] // show error on balance field
});


interface EntryDialogProps {
  type: 'Bank' | 'Debt' | 'Asset';
  onEntry: (values: z.infer<typeof baseSchema> & { balance?: number; value?: number; }) => void;
  trigger: ReactNode;
  item?: Entry;
  translations: any;
}

const typeOptions = {
    'Bank': ['Current Account','Investment Account'],
    'Debt': ['Credit Card', 'Mortgage', 'Personnel Credit'],
    'Asset': ['House', 'Car']
}

const valueFieldLabel = {
    'Bank': 'Balance',
    'Debt': 'Balance',
    'Asset': 'Value'
}

export const EntryDialog: FC<EntryDialogProps> = ({ type, onEntry, trigger, item, translations }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const isEditing = !!item;
  
  const valueFieldName = type === 'Asset' ? 'value' : 'balance';

  const formSchema = baseSchema.extend({
    [valueFieldName]: z.coerce.number().positive({ message: "Value must be a positive number." }),
  });


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: item?.id,
      name: item?.name ?? "",
      [valueFieldName]: (item as any)?.balance ?? (item as any)?.value ?? 0,
      type: (item as any)?.type ?? (type === 'Bank' ? 'Current Account' : ''),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onEntry(values);
    form.reset();
    setOpen(false);
    toast({
      title: "Success!",
      description: translations.successMessage
        .replace('{type}', type)
        .replace('{name}', values.name)
        .replace('{action}', isEditing ? translations.actionUpdated : translations.actionAdded),
    })
  }
  
  const getPlaceholder = (type: 'Bank' | 'Debt' | 'Asset') => {
      switch(type) {
          case 'Bank': return translations.bankNamePlaceholder;
          case 'Debt': return translations.debtNamePlaceholder;
          case 'Asset': return translations.assetNamePlaceholder;
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
                    <Input type="number" placeholder={translations.valuePlaceholder} {...field} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing}>
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
