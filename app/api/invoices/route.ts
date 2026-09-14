import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCompanyId, handleError, ok, unauthorized } from "@/lib/server/api";
import { createInvoiceJournalEntry } from "@/lib/accounting/double-entry";
import { sumMoney, toMoneyDecimal } from "@/lib/accounting/money";
import { serializeInvoice } from "@/lib/serializers";
import { invoiceCreateSchema } from "@/lib/validations/invoice";
import type { InvoiceStatus } from "@prisma/client";

async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  companyId: string,
) {
  const count = await tx.invoice.count({ where: { companyId } });
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function GET(req: NextRequest) {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const status = req.nextUrl.searchParams.get("status");
  const search = req.nextUrl.searchParams.get("search")?.trim();

  const where: Prisma.InvoiceWhereInput = { companyId };

  if (status) {
    where.status = status as InvoiceStatus;
  }

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { contact: { displayName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { contact: true, lineItems: true },
    orderBy: { issueDate: "desc" },
  });

  return ok(invoices.map(serializeInvoice));
}

export async function POST(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const parsed = invoiceCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { contactId, issueDate, dueDate, memo, taxRate, lineItems } =
    parsed.data;

  const customer = await prisma.contact.findFirst({
    where: { id: contactId, companyId, type: "CUSTOMER" },
  });

  if (!customer) {
    return Response.json(
      { success: false, error: "The selected customer is invalid" },
      { status: 400 },
    );
  }

  const issueDateObj = new Date(issueDate);
  const dueDateObj = new Date(dueDate);

  if (Number.isNaN(issueDateObj.getTime()) || Number.isNaN(dueDateObj.getTime())) {
    return Response.json(
      { success: false, error: "Invalid issue or due date" },
      { status: 400 },
    );
  }

  const lines = lineItems.map((item) => {
    const quantity = toMoneyDecimal(item.quantity);
    const unitPrice = toMoneyDecimal(item.unitPrice);
    return {
      productServiceId: item.productServiceId ?? null,
      description: item.description ?? null,
      quantity,
      unitPrice,
      total: quantity.mul(unitPrice).toDecimalPlaces(2),
    };
  });

  const subtotal = sumMoney(lines.map((l) => l.total));
  const taxRateDecimal = toMoneyDecimal(taxRate ?? 0);
  const tax = subtotal.mul(taxRateDecimal).div(100).toDecimalPlaces(2);
  const totalAmount = subtotal.plus(tax);

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await nextInvoiceNumber(tx, companyId);

      const created = await tx.invoice.create({
        data: {
          companyId,
          invoiceNumber,
          contactId,
          issueDate: issueDateObj,
          dueDate: dueDateObj,
          status: "SENT",
          subtotal,
          tax,
          totalAmount,
          memo: memo || null,
          lineItems: {
            create: lines.map((l) => ({
              productServiceId: l.productServiceId,
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              total: l.total,
            })),
          },
        },
      });

      const journalEntry = await createInvoiceJournalEntry(tx, companyId, {
        date: issueDateObj,
        reference: invoiceNumber,
        description: `Invoice ${invoiceNumber} — ${customer.displayName}`,
        amount: totalAmount,
      });

      return tx.invoice.update({
        where: { id: created.id },
        data: { journalEntryId: journalEntry.id },
        include: { contact: true, lineItems: true },
      });
    });

    return ok(serializeInvoice(invoice), 201);
  } catch (error) {
    return handleError(error);
  }
}
