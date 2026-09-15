import { prisma } from "@/lib/prisma";
import { getCompanyId, handleError, ok, unauthorized } from "@/lib/server/api";
import { createPaymentJournalEntry } from "@/lib/accounting/double-entry";
import { serializeInvoice } from "@/lib/serializers";
import { PAYMENT_METHODS } from "@/lib/options";

const VALID_METHODS = new Set(PAYMENT_METHODS.map((m) => m.value));

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId },
  });

  if (!invoice) {
    return Response.json({ success: false, error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "VOID") {
    return Response.json(
      { success: false, error: "A voided invoice cannot be paid" },
      { status: 400 },
    );
  }

  if (invoice.status === "PAID") {
    return Response.json(
      { success: false, error: "This invoice is already paid" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const method =
    typeof body?.paymentMethod === "string" && VALID_METHODS.has(body.paymentMethod)
      ? body.paymentMethod
      : undefined;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await createPaymentJournalEntry(tx, companyId, {
        date: new Date(),
        reference: invoice.invoiceNumber,
        description: `Payment for ${invoice.invoiceNumber}`,
        amount: invoice.totalAmount,
        withholdingTax: invoice.withholdingTaxAmount,
      });

      return tx.invoice.update({
        where: { id },
        data: { status: "PAID", paymentMethod: method },
        include: { contact: true, lineItems: true },
      });
    });

    return ok(serializeInvoice(updated));
  } catch (error) {
    return handleError(error);
  }
}
