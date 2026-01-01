"use client";

import type { FC, ReactNode } from 'react';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { PlusCircle } from 'lucide-react';

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
}

const typeOptions = {
    'Bank': ['Current Account'],
    'Debt': ['Credit Card', 'Mortgage'],
    'Asset': ['House', 'Car']
}

const valueFieldLabel = {
    'Bank': 'Balance',
    'Debt': 'Balance',
    'Asset': 'Value'
}

export const EntryDialog: FC<EntryDialogProps> = ({ type, onEntry, trigger, item }) => {
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
      description: `${type} entry for ${values.name} has been ${isEditing ? 'updated' : 'added'}.`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} {type} Entry</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details for this entry.' : `Add a new ${type.toLowerCase()} entry to your records.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{type} Name</FormLabel>
                  <FormControl>
                    <Input placeholder={type === 'Bank' ? 'e.g., NuBank' : (type === 'Debt' ? 'e.g., Visa Credit Card' : 'e.g., Primary Residence')} {...field} />
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
                  <FormLabel>Current {valueFieldLabel[type]}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 5300.50" {...field} />
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
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select a ${type.toLowerCase()} type`} />
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
              <Button type="submit">Save Entry</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};