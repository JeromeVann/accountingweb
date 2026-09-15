"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { useCompany } from "@/lib/hooks/use-company";

interface PayrollRun {
  id: string;
  employeeName: string;
  payDate: string;
  grossSalary: number;
  paye: number;
  nhif: number;
  nssf: number;
  netPay: number;
}

export default function PayrollPage() {
  const { data: company } = useCompany();
  const currency = company?.currency ?? "KES";

  const query = useQuery({
    queryKey: ["payroll"],
    queryFn: async () => {
      const res = await fetch("/api/payroll");
      const json = await res.json();
      return (json.data ?? []) as PayrollRun[];
    },
  });

  const runs = query.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            PAYE, NHIF &amp; NSSF remittance
          </p>
        </div>
        <Button asChild>
          <Link href="/payroll/new">
            <Plus className="mr-1 h-4 w-4" />
            New Payroll
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {runs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No payroll runs recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Pay date</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">PAYE</TableHead>
                  <TableHead className="text-right">NHIF</TableHead>
                  <TableHead className="text-right">NSSF</TableHead>
                  <TableHead className="text-right">Net pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.employeeName}</TableCell>
                    <TableCell>{formatDate(run.payDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(run.grossSalary, currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(run.paye, currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(run.nhif, currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(run.nssf, currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(run.netPay, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
