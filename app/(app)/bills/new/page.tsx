import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BillForm } from "@/components/bills/bill-form";

export const metadata: Metadata = { title: "New Bill" };

export default function NewBillPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/bills" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New Bill</h1>
      </div>
      <BillForm />
    </div>
  );
}
