import { Prisma, type PrismaClient, type AccountType } from "@prisma/client";

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
 * (4000), and Credit Sales Tax Payable (2100) for the tax portion.
 */
export async function createInvoiceJournalEntry(
  db: Db,
  companyId: string,
  opts: {
    date: Date;
    reference: string;
    description: string;
    subtotal: Prisma.Decimal;
    tax: Prisma.Decimal;
  },
) {
  const accountsReceivable = await findAccountByCode(db, companyId, "1100");
  const salesRevenue = await findAccountByCode(db, companyId, "4000");

  const total = opts.subtotal.plus(opts.tax);
  const lines: JournalLineInput[] = [
    { accountId: accountsReceivable.id, amount: total, type: "DEBIT" },
    { accountId: salesRevenue.id, amount: opts.subtotal, type: "CREDIT" },
  ];

  if (opts.tax.greaterThan(0)) {
    const salesTaxPayable = await findAccountByCode(db, companyId, "2100");
    lines.push({ accountId: salesTaxPayable.id, amount: opts.tax, type: "CREDIT" });
  }

  return createJournalEntry(db, {
    companyId,
    date: opts.date,
    reference: opts.reference,
    description: opts.description,
    lines,
  });
}

/**
 * Rule 3 — Receive Payment: Debit Undeposited Funds (1200), Debit Withholding
 * Tax Receivable (1300) when applicable, Credit Accounts Receivable (1100).
 */
export async function createPaymentJournalEntry(
  db: Db,
  companyId: string,
  opts: {
    date: Date;
    reference: string;
    description: string;
    amount: Prisma.Decimal;
    withholdingTax?: Prisma.Decimal;
  },
) {
  const undepositedFunds = await findAccountByCode(db, companyId, "1200");
  const accountsReceivable = await findAccountByCode(db, companyId, "1100");

  const withholdingTax = opts.withholdingTax ?? new Prisma.Decimal(0);

  const lines: JournalLineInput[] = [
    {
      accountId: undepositedFunds.id,
      amount: opts.amount.minus(withholdingTax),
      type: "DEBIT",
    },
  ];

  if (withholdingTax.greaterThan(0)) {
    const whtAccount = await findOrCreateWithholdingTaxAccount(db, companyId);
    lines.push({ accountId: whtAccount.id, amount: withholdingTax, type: "DEBIT" });
  }

  lines.push({
    accountId: accountsReceivable.id,
    amount: opts.amount,
    type: "CREDIT",
  });

  return createJournalEntry(db, {
    companyId,
    date: opts.date,
    reference: opts.reference,
    description: opts.description,
    lines,
  });
}

export async function findOrCreateWithholdingTaxAccount(
  db: Db,
  companyId: string,
) {
  const existing = await db.account.findFirst({
    where: { companyId, code: "1300" },
  });

  if (existing) return existing;

  try {
    return await db.account.create({
      data: {
        companyId,
        code: "1300",
        name: "Withholding Tax Receivable",
        type: "ASSET",
        normalBalance: "DEBIT",
      },
    });
  } catch {
    return db.account.findFirstOrThrow({ where: { companyId, code: "1300" } });
  }
}

export async function findOrCreateAccount(
  db: Db,
  companyId: string,
  account: { code: string; name: string; type: AccountType },
) {
  const existing = await db.account.findFirst({
    where: { companyId, code: account.code },
  });

  if (existing) return existing;

  const normalBalance =
    account.type === "ASSET" || account.type === "EXPENSE" ? "DEBIT" : "CREDIT";

  try {
    return await db.account.create({
      data: {
        companyId,
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance,
      },
    });
  } catch {
    return db.account.findFirstOrThrow({
      where: { companyId, code: account.code },
    });
  }
}

/**
 * Payroll: Debit Salaries & Wages Expense (6600) for gross pay, Credit PAYE
 * Payable (2300), NHIF Payable (2310), NSSF Payable (2320) and the checking
 * account (1000) for net pay.
 */
export async function createPayrollJournalEntry(
  db: Db,
  companyId: string,
  opts: {
    date: Date;
    reference: string;
    description: string;
    grossSalary: Prisma.Decimal;
    paye: Prisma.Decimal;
    nhif: Prisma.Decimal;
    nssf: Prisma.Decimal;
    netPay: Prisma.Decimal;
  },
) {
  const salaryExpense = await findOrCreateAccount(db, companyId, {
    code: "6600",
    name: "Salaries & Wages Expense",
    type: "EXPENSE",
  });
  const payePayable = await findOrCreateAccount(db, companyId, {
    code: "2300",
    name: "PAYE Payable",
    type: "LIABILITY",
  });
  const nhifPayable = await findOrCreateAccount(db, companyId, {
    code: "2310",
    name: "NHIF Payable",
    type: "LIABILITY",
  });
  const nssfPayable = await findOrCreateAccount(db, companyId, {
    code: "2320",
    name: "NSSF Payable",
    type: "LIABILITY",
  });
  const checkingAccount = await findAccountByCode(db, companyId, "1000");

  const lines: JournalLineInput[] = [
    { accountId: salaryExpense.id, amount: opts.grossSalary, type: "DEBIT" },
  ];

  if (opts.paye.greaterThan(0)) {
    lines.push({ accountId: payePayable.id, amount: opts.paye, type: "CREDIT" });
  }
  if (opts.nhif.greaterThan(0)) {
    lines.push({ accountId: nhifPayable.id, amount: opts.nhif, type: "CREDIT" });
  }
  if (opts.nssf.greaterThan(0)) {
    lines.push({ accountId: nssfPayable.id, amount: opts.nssf, type: "CREDIT" });
  }
  if (opts.netPay.greaterThan(0)) {
    lines.push({ accountId: checkingAccount.id, amount: opts.netPay, type: "CREDIT" });
  }

  return createJournalEntry(db, {
    companyId,
    date: opts.date,
    reference: opts.reference,
    description: opts.description,
    lines,
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
