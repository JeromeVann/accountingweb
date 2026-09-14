import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { moneyToNumber } from "@/lib/accounting/money";
import type { AccountType } from "@prisma/client";

export interface AccountBalance {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debits: Prisma.Decimal;
  credits: Prisma.Decimal;
  /** net = debits - credits */
  balance: Prisma.Decimal;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export async function computeAccountBalances(
  companyId: string,
  range: DateRange = {},
): Promise<AccountBalance[]> {
  const dateFilter: Prisma.DateTimeFilter = {};
  if (range.from) dateFilter.gte = range.from;
  if (range.to) dateFilter.lte = range.to;

  const entries = await prisma.journalEntry.findMany({
    where: {
      companyId,
      ...(range.from || range.to ? { date: dateFilter } : {}),
    },
    include: { lines: { include: { account: true } } },
  });

  const map = new Map<string, AccountBalance>();

  for (const entry of entries) {
    for (const line of entry.lines) {
      let b = map.get(line.accountId);
      if (!b) {
        b = {
          accountId: line.accountId,
          code: line.account.code,
          name: line.account.name,
          type: line.account.type,
          debits: new Prisma.Decimal(0),
          credits: new Prisma.Decimal(0),
          balance: new Prisma.Decimal(0),
        };
        map.set(line.accountId, b);
      }

      if (line.type === "DEBIT") {
        b.debits = b.debits.plus(line.amount);
      } else {
        b.credits = b.credits.plus(line.amount);
      }
    }
  }

  for (const b of map.values()) {
    b.balance = b.debits.minus(b.credits);
  }

  return Array.from(map.values());
}

function sumOfType(balances: AccountBalance[], type: AccountType) {
  return balances
    .filter((b) => b.type === type)
    .reduce((acc, b) => acc.plus(b.balance), new Prisma.Decimal(0));
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debits: number;
  credits: number;
}

export function buildTrialBalance(balances: AccountBalance[]): {
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
} {
  const rows = balances
    .filter((b) => !b.debits.isZero() || !b.credits.isZero())
    .map((b) => ({
      accountId: b.accountId,
      code: b.code,
      name: b.name,
      type: b.type,
      debits: moneyToNumber(b.debits),
      credits: moneyToNumber(b.credits),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    rows,
    totalDebits: moneyToNumber(
      rows.reduce((acc, r) => acc.plus(r.debits), new Prisma.Decimal(0)),
    ),
    totalCredits: moneyToNumber(
      rows.reduce((acc, r) => acc.plus(r.credits), new Prisma.Decimal(0)),
    ),
  };
}

export interface ProfitLoss {
  revenue: number;
  expenses: number;
  netProfit: number;
  revenueAccounts: TrialBalanceRow[];
  expenseAccounts: TrialBalanceRow[];
}

export function buildProfitLoss(balances: AccountBalance[]): ProfitLoss {
  const income = sumOfType(balances, "INCOME");
  const expenses = sumOfType(balances, "EXPENSE");

  // Income has a credit-normal balance: revenue = credits - debits = -balance
  const revenue = income.negated();
  // Expenses have a debit-normal balance: expenses = debits - credits = balance

  const revenueAccounts = balances
    .filter((b) => b.type === "INCOME" && !b.balance.isZero())
    .map((b) => ({
      accountId: b.accountId,
      code: b.code,
      name: b.name,
      type: b.type,
      debits: moneyToNumber(b.debits),
      credits: moneyToNumber(b.credits),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const expenseAccounts = balances
    .filter((b) => b.type === "EXPENSE" && !b.balance.isZero())
    .map((b) => ({
      accountId: b.accountId,
      code: b.code,
      name: b.name,
      type: b.type,
      debits: moneyToNumber(b.debits),
      credits: moneyToNumber(b.credits),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    revenue: moneyToNumber(revenue),
    expenses: moneyToNumber(expenses),
    netProfit: moneyToNumber(revenue.minus(expenses)),
    revenueAccounts,
    expenseAccounts,
  };
}

export interface BalanceSheet {
  assets: { total: number; accounts: TrialBalanceRow[] };
  liabilities: { total: number; accounts: TrialBalanceRow[] };
  equity: { total: number; accounts: TrialBalanceRow[] };
  netProfit: number;
}

export function buildBalanceSheet(balances: AccountBalance[]): BalanceSheet {
  const assetBalance = sumOfType(balances, "ASSET");
  const liabilityBalance = sumOfType(balances, "LIABILITY");
  const equityBalance = sumOfType(balances, "EQUITY");
  const incomeBalance = sumOfType(balances, "INCOME");
  const expenseBalance = sumOfType(balances, "EXPENSE");

  const netProfit = incomeBalance.negated().minus(expenseBalance);

  const toRows = (type: AccountType) =>
    balances
      .filter((b) => b.type === type && !b.balance.isZero())
      .map((b) => ({
        accountId: b.accountId,
        code: b.code,
        name: b.name,
        type: b.type,
        debits: moneyToNumber(b.debits),
        credits: moneyToNumber(b.credits),
      }))
      .sort((a, b) => a.code.localeCompare(b.code));

  return {
    assets: {
      total: moneyToNumber(assetBalance),
      accounts: toRows("ASSET"),
    },
    liabilities: {
      total: moneyToNumber(liabilityBalance.negated()),
      accounts: toRows("LIABILITY"),
    },
    equity: {
      total: moneyToNumber(equityBalance.negated().plus(netProfit)),
      accounts: toRows("EQUITY"),
    },
    netProfit: moneyToNumber(netProfit),
  };
}
