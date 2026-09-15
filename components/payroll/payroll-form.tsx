"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  payrollCreateSchema,
  type PayrollCreateInput,
} from "@/lib/validations/payroll";
import { formatCurrency } from "@/lib/format";
import { useCompany } from "@/lib/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const round2 = (n: number) => Math.round(n * 100) / 100;

function computeDefaults(gross: number) {
  const relief = 2400;
  let tax = 0;
  let remaining = gross;
  const first = Math.min(remaining, 24000);
  tax += first * 0.1;
  remaining -= first;
  if (remaining > 0) {
    const second = Math.min(remaining, 8333);
    tax += second * 0.25;
    remaining -= second;
  }
  if (remaining > 0) tax += remaining * 0.3;
  const paye = Math.max(tax - relief, 0);
  const nhif = Math.min(gross * 0.0275, 1700);
  const nssf = gross * 0.06;
  return { paye, nhif, nssf };
}

export function PayrollForm() {
  const router = useRouter();
  const { data: company } = useCompany();
  const currency = company?.currency ?? "KES";
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PayrollCreateInput>({
    resolver: zodResolver(payrollCreateSchema),
    defaultValues: {
      employeeName: "",
      payDate: new Date().toISOString().slice(0, 10),
      grossSalary: 0,
      paye: 0,
      nhif: 0,
      nssf: 0,
    },
  });

  const gross = Number(form.watch("grossSalary") ?? 0);
  const paye = Number(form.watch("paye") ?? 0);
  const nhif = Number(form.watch("nhif") ?? 0);
  const nssf = Number(form.watch("nssf") ?? 0);
  const net = gross - paye - nhif - nssf;

  useEffect(() => {
    const d = computeDefaults(gross);
    form.setValue("paye", round2(d.paye));
    form.setValue("nhif", round2(d.nhif));
    form.setValue("nssf", round2(d.nssf));
  }, [gross, form]);

  async function onSubmit(values: PayrollCreateInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Something went wrong");
        return;
      }
      toast.success("Payroll recorded");
      router.push("/payroll");
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
          <CardTitle>Payroll details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="employeeName">Employee name</Label>
            <Input id="employeeName" placeholder="Jane Doe" {...form.register("employeeName")} />
            {form.formState.errors.employeeName && (
              <p className="text-sm text-destructive">{form.formState.errors.employeeName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="payDate">Pay date</Label>
            <Input id="payDate" type="date" {...form.register("payDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grossSalary">Gross salary</Label>
            <Input
              id="grossSalary"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...form.register("grossSalary", { valueAsNumber: true })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statutory deductions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="paye">PAYE (income tax)</Label>
            <Input id="paye" type="number" step="0.01" {...form.register("paye", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nhif">NHIF</Label>
            <Input id="nhif" type="number" step="0.01" {...form.register("nhif", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nssf">NSSF</Label>
            <Input id="nssf" type="number" step="0.01" {...form.register("nssf", { valueAsNumber: true })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="ml-auto flex w-64 flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross pay</span>
              <span className="tabular-nums">{formatCurrency(gross, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deductions</span>
              <span className="tabular-nums">−{formatCurrency(paye + nhif + nssf, currency)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 text-base font-semibold">
              <span>Net pay</span>
              <span className="tabular-nums">{formatCurrency(net, currency)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/payroll")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Record payroll"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
