"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type BillStatus = "DRAFT" | "AWAITING_PAYMENT" | "PAID";

interface Bill {
  id: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  status: BillStatus;
  totalAmount: number;
  contact: { displayName: string };
  expenseAccount: { code: string; name: string } | null;
}

const statusStyles: Record<BillStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  AWAITING_PAYMENT: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
};

export default function BillsPage() {
  const [status, setStatus] = useState<string>("ALL");
  const queryClient = useQueryClient();
  const { data: company } = useCompany();
  const currency = company?.currency ?? "KES";

  const query = useQuery({
    queryKey: ["bills", status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      const res = await fetch(`/api/bills?${params.toString()}`);
      const json = await res.json();
      return (json.data ?? []) as Bill[];
    },
  });

  const payMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bills/${id}/pay`, { method: "PUT" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Bill marked as paid");
      queryClient.invalidateQueries({ queryKey: ["bills"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const bills = query.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track your bills</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="AWAITING_PAYMENT">Awaiting payment</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild>
            <Link href="/bills/new">
              <Plus className="mr-1 h-4 w-4" />
              New Bill
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {bills.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No bills found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Bill date</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.billNumber}</TableCell>
                    <TableCell>{bill.contact.displayName}</TableCell>
                    <TableCell>{formatDate(bill.billDate)}</TableCell>
                    <TableCell>{formatDate(bill.dueDate)}</TableCell>
                    <TableCell>{bill.expenseAccount?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusStyles[bill.status] ?? ""}>
                        {bill.status === "AWAITING_PAYMENT"
                          ? "AWAITING PAYMENT"
                          : bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(bill.totalAmount, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {bill.status !== "PAID" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => payMutation.mutate(bill.id)}
                          disabled={payMutation.isPending}
                        >
                          Mark paid
                        </Button>
                      )}
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
