import type { Prisma } from "@prisma/client";
import { moneyToNumber } from "@/lib/accounting/money";

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: { contact: true; lineItems: true };
}>;

export type ContactWithRelations = Prisma.ContactGetPayload<object>;

export function serializeMoney(value: Prisma.Decimal | number | string | null) {
  return moneyToNumber(value);
}

export function serializeInvoice(invoice: InvoiceWithRelations) {
  return {
    id: invoice.id,
    companyId: invoice.companyId,
    invoiceNumber: invoice.invoiceNumber,
    contactId: invoice.contactId,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    status: invoice.status,
    subtotal: moneyToNumber(invoice.subtotal),
    tax: moneyToNumber(invoice.tax),
    totalAmount: moneyToNumber(invoice.totalAmount),
    pricesIncludeTax: invoice.pricesIncludeTax,
    withholdingTaxRate: moneyToNumber(invoice.withholdingTaxRate),
    withholdingTaxAmount: moneyToNumber(invoice.withholdingTaxAmount),
    memo: invoice.memo,
    paymentMethod: invoice.paymentMethod,
    journalEntryId: invoice.journalEntryId,
    contact: serializeContact(invoice.contact),
    lineItems: invoice.lineItems.map((line) => ({
      id: line.id,
      productServiceId: line.productServiceId,
      description: line.description,
      quantity: moneyToNumber(line.quantity),
      unitPrice: moneyToNumber(line.unitPrice),
      total: moneyToNumber(line.total),
    })),
  };
}

export function serializeContact(contact: ContactWithRelations) {
  return {
    id: contact.id,
    companyId: contact.companyId,
    type: contact.type,
    displayName: contact.displayName,
    email: contact.email,
    phone: contact.phone,
    billingAddress: contact.billingAddress,
    openingBalance: moneyToNumber(contact.openingBalance),
  };
}

export type BillWithRelations = Prisma.BillGetPayload<{
  include: { contact: true; lineItems: true; expenseAccount: true };
}>;

export function serializeBill(bill: BillWithRelations) {
  return {
    id: bill.id,
    companyId: bill.companyId,
    billNumber: bill.billNumber,
    contactId: bill.contactId,
    billDate: bill.billDate.toISOString(),
    dueDate: bill.dueDate.toISOString(),
    status: bill.status,
    totalAmount: moneyToNumber(bill.totalAmount),
    expenseAccountId: bill.expenseAccountId,
    expenseAccount: bill.expenseAccount
      ? { code: bill.expenseAccount.code, name: bill.expenseAccount.name }
      : null,
    journalEntryId: bill.journalEntryId,
    contact: serializeContact(bill.contact),
    lineItems: bill.lineItems.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: moneyToNumber(line.quantity),
      unitPrice: moneyToNumber(line.unitPrice),
      total: moneyToNumber(line.total),
    })),
  };
}

export function serializeCompany(
  company: Prisma.CompanyGetPayload<object>,
) {
  return {
    id: company.id,
    legalName: company.legalName,
    currency: company.currency,
    taxId: company.taxId,
    fiscalYearStart: company.fiscalYearStart.toISOString(),
    industry: company.industry,
  };
}

export type JournalEntryWithRelations = Prisma.JournalEntryGetPayload<{
  include: { lines: { include: { account: true } } };
}>;

export function serializeJournalEntry(entry: JournalEntryWithRelations) {
  return {
    id: entry.id,
    companyId: entry.companyId,
    date: entry.date.toISOString(),
    reference: entry.reference,
    description: entry.description,
    isReconciled: entry.isReconciled,
    createdAt: entry.createdAt.toISOString(),
    lines: entry.lines.map((line) => ({
      id: line.id,
      accountId: line.accountId,
      amount: moneyToNumber(line.amount),
      type: line.type,
      account: {
        code: line.account.code,
        name: line.account.name,
        type: line.account.type,
      },
    })),
  };
}
