import { prisma } from "@/lib/prisma";
import { getCompanyId, handleError, ok, unauthorized } from "@/lib/server/api";
import { createBillPaymentJournalEntry } from "@/lib/accounting/double-entry";
import { serializeBill } from "@/lib/serializers";

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const { id } = await params;

  const bill = await prisma.bill.findFirst({
    where: { id, companyId },
  });

  if (!bill) {
    return Response.json({ success: false, error: "Bill not found" }, { status: 404 });
  }

  if (bill.status === "PAID") {
    return Response.json(
      { success: false, error: "This bill is already paid" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await createBillPaymentJournalEntry(tx, companyId, {
        date: new Date(),
        reference: bill.billNumber,
        description: `Payment for ${bill.billNumber}`,
        amount: bill.totalAmount,
      });

      return tx.bill.update({
        where: { id },
        data: { status: "PAID" },
        include: { contact: true, lineItems: true, expenseAccount: true },
      });
    });

    return ok(serializeBill(updated));
  } catch (error) {
    return handleError(error);
  }
}
