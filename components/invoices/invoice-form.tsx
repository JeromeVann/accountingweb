"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  invoiceCreateSchema,
  type InvoiceCreateInput,
} from "@/lib/validations/invoice";
import { formatCurrency } from "@/lib/format";
import { useCompany } from "@/lib/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ContactOption {
  id: string;
  displayName: string;
}

export function InvoiceForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: company } = useCompany();
  const currency = company?.currency ?? "KES";
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  const customersQuery = useQuery({
    queryKey: ["contacts", "CUSTOMER"],
    queryFn: async () => {
      const res = await fetch("/api/contacts?type=CUSTOMER");
      const json = await res.json();
      return (json.data ?? []) as ContactOption[];
    },
  });
  const customers = customersQuery.data ?? [];

  const form = useForm<InvoiceCreateInput>({
    resolver: zodResolver(invoiceCreateSchema),
    defaultValues: {
      contactId: "",
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      taxRate: 0,
      memo: "",
      lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const watchedLineItems = form.watch("lineItems");
  const taxRate = Number(form.watch("taxRate") ?? 0);
  const subtotal = watchedLineItems.reduce(
    (sum, li) => sum + Number(li.quantity || 0) * Number(li.unitPrice || 0),
    0,
  );
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;

  async function addCustomer() {
    setSavingCustomer(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CUSTOMER",
          displayName: customerName,
          email: customerEmail || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Could not create customer");
        return;
      }
      toast.success("Customer added");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      form.setValue("contactId", json.data.id);
      setCustomerName("");
      setCustomerEmail("");
      setDialogOpen(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingCustomer(false);
    }
  }

  async function onSubmit(values: InvoiceCreateInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Something went wrong");
        return;
      }
      toast.success("Invoice created");
      router.push("/invoices");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Customer</Label>
            <div className="flex gap-2">
              <Select
                value={form.watch("contactId")}
                onValueChange={(v) => form.setValue("contactId", v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New customer</DialogTitle>
                    <DialogDescription>
                      Add a customer to this company.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Name</Label>
                      <Input
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerEmail">Email</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={addCustomer}
                      disabled={savingCustomer || !customerName.trim()}
                    >
                      {savingCustomer ? "Saving…" : "Add customer"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {form.formState.errors.contactId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.contactId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="issueDate">Issue date</Label>
            <Input id="issueDate" type="date" {...form.register("issueDate")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due date</Label>
            <Input id="dueDate" type="date" {...form.register("dueDate")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Line items</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[1fr_72px_110px_110px_40px] gap-3 text-xs font-medium text-muted-foreground">
            <span>Description</span>
            <span>Qty</span>
            <span>Rate</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-[1fr_72px_110px_110px_40px] items-center gap-3"
            >
              <Input
                placeholder="Description"
                {...form.register(`lineItems.${index}.description`)}
              />
              <Input
                type="number"
                step="any"
                placeholder="1"
                {...form.register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
              />
              <div className="text-right tabular-nums">
                {formatCurrency(
                  Number(watchedLineItems[index]?.quantity || 0) *
                    Number(watchedLineItems[index]?.unitPrice || 0),
                  currency,
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                className="max-w-[160px]"
                {...form.register("taxRate", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memo">Memo</Label>
              <Textarea id="memo" placeholder="Optional notes" {...form.register("memo")} />
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex w-60 justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal, currency)}</span>
            </div>
            <div className="flex w-60 justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="tabular-nums">{formatCurrency(tax, currency)}</span>
            </div>
            <div className="flex w-60 justify-between border-t pt-1 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total, currency)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/invoices")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save invoice"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
