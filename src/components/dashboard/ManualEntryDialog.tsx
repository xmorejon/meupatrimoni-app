"use client";

import type { FC } from 'react';
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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export const manualEntrySchema = z.object({
  bank: z.string().min(2, { message: "Bank name must be at least 2 characters." }),
  balance: z.coerce.number().positive({ message: "Balance must be a positive number." }),
});

interface ManualEntryDialogProps {
  onAddBalance: (values: z.infer<typeof manualEntrySchema>) => void;
}

export const ManualEntryDialog: FC<ManualEntryDialogProps> = ({ onAddBalance }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof manualEntrySchema>>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: {
      bank: "",
      balance: 0,
    },
  });

  function onSubmit(values: z.infer<typeof manualEntrySchema>) {
    onAddBalance(values);
    form.reset();
    setOpen(false);
    toast({
      title: "Success!",
      description: `Balance for ${values.bank} has been added.`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle />
          Add Balance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manual Entry</DialogTitle>
          <DialogDescription>
            Manually add a balance for a bank account. This will be recorded with the current timestamp.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="bank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., NuBank" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Balance</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 5300.50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Balance</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
