import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCompanyId, handleError, ok, unauthorized } from "@/lib/server/api";
import { createBillJournalEntry } from "@/lib/accounting/double-entry";
import { sumMoney, toMoneyDecimal } from "@/lib/accounting/money";
import { serializeBill } from "@/lib/serializers";
import { billCreateSchema } from "@/lib/validations/bill";
import type { BillStatus } from "@prisma/client";

async function nextBillNumber(tx: Prisma.TransactionClient, companyId: string) {
  const count = await tx.bill.count({ where: { companyId } });
  const year = new Date().getFullYear();
  return `BILL-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function GET(req: NextRequest) {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const status = req.nextUrl.searchParams.get("status");
  const where: Prisma.BillWhereInput = { companyId };
  if (status) where.status = status as BillStatus;

  const bills = await prisma.bill.findMany({
    where,
    include: { contact: true, lineItems: true, expenseAccount: true },
    orderBy: { billDate: "desc" },
  });

  return ok(bills.map(serializeBill));
}

export async function POST(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const parsed = billCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { contactId, expenseAccountId, billDate, dueDate, lineItems } =
    parsed.data;

  const vendor = await prisma.contact.findFirst({
    where: { id: contactId, companyId, type: "VENDOR" },
  });

  if (!vendor) {
    return Response.json(
      { success: false, error: "The selected vendor is invalid" },
      { status: 400 },
    );
  }

  const expenseAccount = await prisma.account.findFirst({
    where: { id: expenseAccountId, companyId, type: "EXPENSE" },
  });

  if (!expenseAccount) {
    return Response.json(
      { success: false, error: "The selected expense account is invalid" },
      { status: 400 },
    );
  }

  const billDateObj = new Date(billDate);
  const dueDateObj = new Date(dueDate);
  if (Number.isNaN(billDateObj.getTime()) || Number.isNaN(dueDateObj.getTime())) {
    return Response.json(
      { success: false, error: "Invalid bill or due date" },
      { status: 400 },
    );
  }

  const lines = lineItems.map((item) => {
    const quantity = toMoneyDecimal(item.quantity);
    const unitPrice = toMoneyDecimal(item.unitPrice);
    return {
      description: item.description ?? null,
      quantity,
      unitPrice,
      total: quantity.mul(unitPrice).toDecimalPlaces(2),
    };
  });

  const totalAmount = sumMoney(lines.map((l) => l.total));

  try {
    const bill = await prisma.$transaction(async (tx) => {
      const billNumber = await nextBillNumber(tx, companyId);

      const created = await tx.bill.create({
        data: {
          companyId,
          billNumber,
          contactId,
          billDate: billDateObj,
          dueDate: dueDateObj,
          status: "AWAITING_PAYMENT",
          totalAmount,
          expenseAccountId,
          lineItems: {
            create: lines.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              total: l.total,
            })),
          },
        },
      });

      const journalEntry = await createBillJournalEntry(tx, companyId, {
        date: billDateObj,
        reference: billNumber,
        description: `Bill ${billNumber} — ${vendor.displayName}`,
        amount: totalAmount,
        expenseAccountId,
      });

      return tx.bill.update({
        where: { id: created.id },
        data: { journalEntryId: journalEntry.id },
        include: { contact: true, lineItems: true, expenseAccount: true },
      });
    });

    return ok(serializeBill(bill), 201);
  } catch (error) {
    return handleError(error);
  }
}
