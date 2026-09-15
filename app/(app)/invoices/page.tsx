"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShareDialog } from "@/components/invoices/share-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { PAYMENT_METHODS, paymentMethodLabel } from "@/lib/options";

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  totalAmount: number;
  paymentMethod: string | null;
  contact: { displayName: string };
}

const statusStyles: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-rose-100 text-rose-700",
  VOID: "bg-slate-200 text-slate-500",
};

export default function InvoicesPage() {
  const [status, setStatus] = useState<string>("ALL");
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [sharing, setSharing] = useState<Invoice | null>(null);
  const [method, setMethod] = useState<string>("BANK_TRANSFER");
  const queryClient = useQueryClient();
  const { data: company } = useCompany();
  const currency = company?.currency ?? "KES";

  const query = useQuery({
    queryKey: ["invoices", status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      const res = await fetch(`/api/invoices?${params.toString()}`);
      const json = await res.json();
      return (json.data ?? []) as Invoice[];
    },
  });

  const payMutation = useMutation({
    mutationFn: async ({
      id,
      paymentMethod,
    }: {
      id: string;
      paymentMethod: string;
    }) => {
      const res = await fetch(`/api/invoices/${id}/pay`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Invoice marked as paid");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setPaying(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const invoices = query.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Manage your sales invoices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
              <SelectItem value="VOID">Void</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild>
            <Link href="/invoices/new">
              <Plus className="mr-1 h-4 w-4" />
              New Invoice
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {invoices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No invoices found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Issue date</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>{invoice.contact.displayName}</TableCell>
                    <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>
                      <Badge className={statusStyles[invoice.status] ?? ""}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.paymentMethod
                        ? paymentMethodLabel(invoice.paymentMethod)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(invoice.totalAmount, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSharing(invoice)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        {(invoice.status === "SENT" ||
                          invoice.status === "OVERDUE") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPaying(invoice);
                              setMethod("BANK_TRANSFER");
                            }}
                          >
                            Mark paid
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!paying} onOpenChange={(open) => !open && setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {paying?.invoiceNumber} — {paying?.contact.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaying(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                paying && payMutation.mutate({ id: paying.id, paymentMethod: method })
              }
              disabled={payMutation.isPending}
            >
              {payMutation.isPending ? "Recording…" : "Confirm payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareDialog
        invoice={sharing}
        currency={currency}
        onClose={() => setSharing(null)}
      />
    </div>
  );
}
