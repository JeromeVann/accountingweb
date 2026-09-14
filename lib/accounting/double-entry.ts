import { Prisma, type PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export type JournalLineType = "DEBIT" | "CREDIT";

export interface JournalLineInput {
  accountId: string;
  amount: Prisma.Decimal;
  type: JournalLineType;
}

export interface JournalEntryInput {
  companyId: string;
  date: Date;
  reference?: string | null;
  description?: string | null;
  isReconciled?: boolean;
  lines: JournalLineInput[];
}

export class AccountingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountingError";
  }
}

export function sumLines(
  lines: JournalLineInput[],
  type: JournalLineType,
): Prisma.Decimal {
  return lines
    .filter((line) => line.type === type)
    .reduce((acc, line) => acc.plus(line.amount), new Prisma.Decimal(0));
}

/**
 * Rule 1 — Balanced Entries: every journal entry must have equal total debits
 * and credits. Throws so that an enclosing `$transaction` rolls back.
 */
export function assertBalanced(lines: JournalLineInput[]): void {
  if (lines.length === 0) {
    throw new AccountingError("A journal entry requires at least one line.");
  }

  const debits = sumLines(lines, "DEBIT");
  const credits = sumLines(lines, "CREDIT");

  if (!debits.equals(credits)) {
    throw new AccountingError(
      `Journal entry is not balanced: debits ${debits.toFixed(
        2,
      )} != credits ${credits.toFixed(2)}`,
    );
  }
}

export async function findAccountByCode(
  db: Db,
  companyId: string,
  code: string,
) {
  const account = await db.account.findFirst({
    where: { companyId, code },
  });

  if (!account) {
    throw new AccountingError(`Account with code "${code}" was not found.`);
  }

  return account;
}

export async function createJournalEntry(db: Db, input: JournalEntryInput) {
  assertBalanced(input.lines);

  return db.journalEntry.create({
    data: {
      companyId: input.companyId,
      date: input.date,
      reference: input.reference,
      description: input.description,
      isReconciled: input.isReconciled ?? false,
      lines: {
        create: input.lines.map((line) => ({
          accountId: line.accountId,
          amount: line.amount,
          type: line.type,
        })),
      },
    },
    include: { lines: { include: { account: true } } },
  });
}

/**
 * Rule 2 — Invoicing: Debit Accounts Receivable (1100), Credit Sales Revenue
 * (4000).
 */
export async function createInvoiceJournalEntry(
  db: Db,
  companyId: string,
  opts: {
    date: Date;
    reference: string;
    description: string;
    amount: Prisma.Decimal;
  },
) {
  const accountsReceivable = await findAccountByCode(db, companyId, "1100");
  const salesRevenue = await findAccountByCode(db, companyId, "4000");

  return createJournalEntry(db, {
    companyId,
    date: opts.date,
    reference: opts.reference,
    description: opts.description,
    lines: [
      { accountId: accountsReceivable.id, amount: opts.amount, type: "DEBIT" },
      { accountId: salesRevenue.id, amount: opts.amount, type: "CREDIT" },
    ],
  });
}

/**
 * Rule 3 — Receive Payment: Debit Undeposited Funds (1200), Credit Accounts
 * Receivable (1100).
 */
export async function createPaymentJournalEntry(
  db: Db,
  companyId: string,
  opts: {
    date: Date;
    reference: string;
    description: string;
    amount: Prisma.Decimal;
  },
) {
  const undepositedFunds = await findAccountByCode(db, companyId, "1200");
  const accountsReceivable = await findAccountByCode(db, companyId, "1100");

  return createJournalEntry(db, {
    companyId,
    date: opts.date,
    reference: opts.reference,
    description: opts.description,
    lines: [
      { accountId: undepositedFunds.id, amount: opts.amount, type: "DEBIT" },
      { accountId: accountsReceivable.id, amount: opts.amount, type: "CREDIT" },
    ],
  });
}

/**
 * Bills (Expenses): Debit the selected expense account, Credit Accounts Payable
 * (2000).
 */
export async function createBillJournalEntry(
  db: Db,
  companyId: string,
  opts: {
    date: Date;
    reference: string;
    description: string;
    amount: Prisma.Decimal;
    expenseAccountId: string;
  },
) {
  const expenseAccount = await db.account.findFirst({
    where: { id: opts.expenseAccountId, companyId },
  });

  if (!expenseAccount) {
    throw new AccountingError("Expense account not found.");
  }

  const accountsPayable = await findAccountByCode(db, companyId, "2000");

  return createJournalEntry(db, {
    companyId,
    date: opts.date,
    reference: opts.reference,
    description: opts.description,
    lines: [
      { accountId: expenseAccount.id, amount: opts.amount, type: "DEBIT" },
      { accountId: accountsPayable.id, amount: opts.amount, type: "CREDIT" },
    ],
  });
}

/**
 * Pay Bill: Debit Accounts Payable (2000), Credit Checking Account (1000).
 */
export async function createBillPaymentJournalEntry(
  db: Db,
  companyId: string,
  opts: {
    date: Date;
    reference: string;
    description: string;
    amount: Prisma.Decimal;
  },
) {
  const accountsPayable = await findAccountByCode(db, companyId, "2000");
  const checkingAccount = await findAccountByCode(db, companyId, "1000");

  return createJournalEntry(db, {
    companyId,
    date: opts.date,
    reference: opts.reference,
    description: opts.description,
    lines: [
      { accountId: accountsPayable.id, amount: opts.amount, type: "DEBIT" },
      { accountId: checkingAccount.id, amount: opts.amount, type: "CREDIT" },
    ],
  });
}

/**
 * Rule 4 — Void: create a reversing journal entry (opposite debits/credits) on
 * today's date. The original entry is left untouched.
 */
export async function voidJournalEntry(
  db: Db,
  companyId: string,
  entryId: string,
) {
  const entry = await db.journalEntry.findFirst({
    where: { id: entryId, companyId },
    include: { lines: true },
  });

  if (!entry) {
    throw new AccountingError("Journal entry not found.");
  }

  const reversingLines = entry.lines.map((line) => ({
    accountId: line.accountId,
    amount: line.amount,
    type: (line.type === "DEBIT" ? "CREDIT" : "DEBIT") as JournalLineType,
  }));

  return createJournalEntry(db, {
    companyId,
    date: new Date(),
    reference: entry.reference ? `VOID-${entry.reference}` : "VOID",
    description: `Void of ${entry.description ?? entry.reference ?? entry.id}`,
    lines: reversingLines,
  });
}

/**
 * Rule 4 — Delete Immutability: reconciled entries cannot be deleted.
 */
export async function deleteJournalEntry(
  db: Db,
  companyId: string,
  entryId: string,
) {
  const entry = await db.journalEntry.findFirst({
    where: { id: entryId, companyId },
  });

  if (!entry) {
    throw new AccountingError("Journal entry not found.");
  }

  if (entry.isReconciled) {
    throw new AccountingError(
      "A reconciled journal entry cannot be deleted. Void it instead.",
    );
  }

  return db.journalEntry.delete({ where: { id: entryId } });
}
