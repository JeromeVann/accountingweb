import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { moneyToNumber } from "@/lib/accounting/money";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { contact: true, lineItems: true, company: true },
  });

  if (!invoice) notFound();

  const currency = invoice.company.currency;
  const amountDue = moneyToNumber(invoice.totalAmount) - moneyToNumber(invoice.withholdingTaxAmount);

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-10">
      <div className="mx-auto max-w-2xl rounded-lg border bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-xl font-semibold">{invoice.company.legalName}</h1>
            {invoice.company.taxId && (
              <p className="text-sm text-muted-foreground">
                Tax ID: {invoice.company.taxId}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold uppercase tracking-wide">Invoice</p>
            <p className="text-sm text-muted-foreground">{invoice.invoiceNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 border-b py-6 text-sm">
          <div>
            <p className="font-medium text-muted-foreground">Billed to</p>
            <p className="font-semibold">{invoice.contact.displayName}</p>
            {invoice.contact.email && <p>{invoice.contact.email}</p>}
          </div>
          <div className="text-right">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Issue date</span>
              <span>{formatDate(invoice.issueDate)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Due date</span>
              <span>{formatDate(invoice.dueDate)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">{invoice.status}</span>
            </div>
          </div>
        </div>

        <table className="w-full py-6 text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((line) => (
              <tr key={line.id} className="border-b last:border-0">
                <td className="py-2">{line.description ?? "—"}</td>
                <td className="py-2 text-right tabular-nums">
                  {moneyToNumber(line.quantity)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatCurrency(moneyToNumber(line.unitPrice), currency)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatCurrency(moneyToNumber(line.total), currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto flex w-64 flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">
              {formatCurrency(moneyToNumber(invoice.subtotal), currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="tabular-nums">
              {formatCurrency(moneyToNumber(invoice.tax), currency)}
            </span>
          </div>
          {moneyToNumber(invoice.withholdingTaxAmount) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Withholding tax</span>
              <span className="tabular-nums text-rose-600">
                −{formatCurrency(moneyToNumber(invoice.withholdingTaxAmount), currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">
              {formatCurrency(moneyToNumber(invoice.totalAmount), currency)}
            </span>
          </div>
          {moneyToNumber(invoice.withholdingTaxAmount) > 0 && (
            <div className="flex justify-between font-medium">
              <span>Amount due</span>
              <span className="tabular-nums">{formatCurrency(amountDue, currency)}</span>
            </div>
          )}
        </div>

        {invoice.memo && (
          <p className="mt-6 border-t pt-4 text-sm text-muted-foreground">
            {invoice.memo}
          </p>
        )}
      </div>
    </div>
  );
}
