"use client";

import type { FC, ReactNode } from "react";
import { useState } from "react";
import { z, type ZodType } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Entry } from "@/lib/types";

// Base schema for common fields
export const baseSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(2, { message: "El nom ha de tenir almenys 2 caràcters." }),
  type: z.string().min(1, { message: "Si us plau, selecciona un tipus." }),
});

// Create two distinct, static schemas. This is the robust solution that avoids confusing TypeScript.
export const bankDebtSchema = baseSchema.extend({
  balance: z.coerce
    .number({ invalid_type_error: "El valor ha de ser un número." })
    .nonnegative({ message: "El valor no pot ser negatiu." }),
});

export const assetSchema = baseSchema.extend({
  value: z.coerce
    .number({ invalid_type_error: "El valor ha de ser un número." })
    .nonnegative({ message: "El valor no pot ser negatiu." }),
});

// A type that represents the union of both possible form structures.
// This provides a clear, unified type for our form state.
type FormValues = z.infer<typeof bankDebtSchema> | z.infer<typeof assetSchema>;

const typeTranslations: { [key: string]: string } = {
  House: "Casa",
  Car: "Cotxe",
  "Current Account": "Compte Corrent",
  "Investment Account": "Compte d'Inversió",
  "Credit Card": "Targeta de Crèdit",
  Mortgage: "Hipoteca",
  "Personal Loan": "Crèdit Personal",
};

const reverseTypeTranslations: { [key: string]: string } = Object.fromEntries(
  Object.entries(typeTranslations).map(([key, value]) => [value, key])
);

interface EntryDialogProps {
  type: "Bank" | "Debt" | "Asset";
  onEntry: (values: FormValues) => void;
  trigger: ReactNode;
  item?: Entry;
  translations: any;
}

const typeOptions = {
  Bank: ["Compte Corrent", "Compte d'Inversió"],
  Debt: ["Targeta de Crèdit", "Hipoteca", "Crèdit Personal"],
  Asset: ["Casa", "Cotxe"],
};

const valueFieldLabel = {
  Bank: "Balanç",
  Debt: "Balanç",
  Asset: "Valor",
};

export const EntryDialog: FC<EntryDialogProps> = ({
  type,
  onEntry,
  trigger,
  item,
  translations,
}) => {
  const [open, setOpen] = useState(false);
  const isEditing = !!item;

  const formSchema = type === "Asset" ? assetSchema : bankDebtSchema;
  const valueFieldName = type === "Asset" ? "value" : "balance";

  const getDefaults = (): Partial<FormValues> => {
    const getTranslatedType = () => {
      if (item && "type" in item && item.type)
        return typeTranslations[item.type] || item.type;
      return undefined;
    };

    const getInitialValue = (entry?: Entry): number | undefined => {
      if (!entry) return 0;
      const num =
        "balance" in entry ? entry.balance : "value" in entry ? entry.value : 0;
      return Number.isFinite(num) ? num : 0;
    };

    const defaults = {
      id: item?.id,
      name: item?.name ?? "",
      type: getTranslatedType(),
    };

    if (type === "Asset") {
      return { ...defaults, value: getInitialValue(item) };
    } else {
      return { ...defaults, balance: getInitialValue(item) };
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as ZodType<FormValues>),
    defaultValues: getDefaults(),
  });

  function onSubmit(values: FormValues) {
    const submissionValues: FormValues = {
      ...values,
      type: reverseTypeTranslations[values.type!] || values.type!,
    };
    onEntry(submissionValues);
    form.reset();
    setOpen(false);
  }

  const getPlaceholder = (type: "Bank" | "Debt" | "Asset") => {
    switch (type) {
      case "Bank":
        return translations.bankNamePlaceholder;
      case "Debt":
        return translations.debtNamePlaceholder;
      case "Asset":
        return translations.assetNamePlaceholder;
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? translations.editTitle : translations.addTitle}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? translations.editDescription
              : translations.addDescription}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{translations.nameLabel}</FormLabel>
                  <FormControl>
                    <Input placeholder={getPlaceholder(type)} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={valueFieldName as "balance" | "value"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {translations.valueLabel.replace(
                      "{valueFieldLabel}",
                      valueFieldLabel[type]
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={translations.valuePlaceholder}
                      {...field}
                      value={field.value ?? ""}
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? ""}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={translations.selectTypePlaceholder}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {typeOptions[type].map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
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
