"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { billCreateSchema, type BillCreateInput } from "@/lib/validations/bill";
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

interface ContactOption {
  id: string;
  displayName: string;
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

export function BillForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: company } = useCompany();
  const currency = company?.currency ?? "KES";

  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [savingVendor, setSavingVendor] = useState(false);

  const vendorsQuery = useQuery({
    queryKey: ["contacts", "VENDOR"],
    queryFn: async () => {
      const res = await fetch("/api/contacts?type=VENDOR");
      const json = await res.json();
      return (json.data ?? []) as ContactOption[];
    },
  });

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      const json = await res.json();
      return (json.data ?? []) as AccountOption[];
    },
  });

  const vendors = vendorsQuery.data ?? [];
  const expenseAccounts = (accountsQuery.data ?? []).filter(
    (a) => a.type === "EXPENSE",
  );

  const form = useForm<BillCreateInput>({
    resolver: zodResolver(billCreateSchema),
    defaultValues: {
      contactId: "",
      expenseAccountId: "",
      billDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const watchedLineItems = form.watch("lineItems");
  const total = watchedLineItems.reduce(
    (sum, li) => sum + Number(li.quantity || 0) * Number(li.unitPrice || 0),
    0,
  );

  async function addVendor() {
    setSavingVendor(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "VENDOR",
          displayName: vendorName,
          email: vendorEmail || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Could not create vendor");
        return;
      }
      toast.success("Vendor added");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      form.setValue("contactId", json.data.id);
      setVendorName("");
      setVendorEmail("");
      setDialogOpen(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingVendor(false);
    }
  }

  async function onSubmit(values: BillCreateInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Something went wrong");
        return;
      }
      toast.success("Bill created");
      router.push("/bills");
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
          <CardTitle>Bill details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Vendor</Label>
            <div className="flex gap-2">
              <Select
                value={form.watch("contactId")}
                onValueChange={(v) => form.setValue("contactId", v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.displayName}
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
                    <DialogTitle>New vendor</DialogTitle>
                    <DialogDescription>Add a vendor to this company.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="vendorName">Name</Label>
                      <Input
                        id="vendorName"
                        value={vendorName}
                        onChange={(e) => setVendorName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendorEmail">Email</Label>
                      <Input
                        id="vendorEmail"
                        type="email"
                        value={vendorEmail}
                        onChange={(e) => setVendorEmail(e.target.value)}
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
                      onClick={addVendor}
                      disabled={savingVendor || !vendorName.trim()}
                    >
                      {savingVendor ? "Saving…" : "Add vendor"}
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
            <Label>Expense account</Label>
            <Select
              value={form.watch("expenseAccountId")}
              onValueChange={(v) => form.setValue("expenseAccountId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {expenseAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} · {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.expenseAccountId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.expenseAccountId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="billDate">Bill date</Label>
            <Input id="billDate" type="date" {...form.register("billDate")} />
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
          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex w-60 justify-between border-t pt-1 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total, currency)}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/bills")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save bill"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
