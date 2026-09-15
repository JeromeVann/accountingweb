import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PayrollForm } from "@/components/payroll/payroll-form";

export const metadata: Metadata = { title: "New Payroll" };

export default function NewPayrollPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/payroll" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New Payroll</h1>
      </div>
      <PayrollForm />
    </div>
  );
}
