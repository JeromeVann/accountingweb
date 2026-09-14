import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export const metadata: Metadata = { title: "New Invoice" };

export default function NewInvoicePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/invoices"
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New Invoice</h1>
      </div>
      <InvoiceForm />
    </div>
  );
}
