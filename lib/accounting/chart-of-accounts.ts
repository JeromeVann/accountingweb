import type { AccountType, NormalBalance } from "@prisma/client";
import chartOfAccountsJson from "../../prisma/data/chart-of-accounts.json";

export interface DefaultAccount {
  code: string;
  name: string;
  type: AccountType;
  description?: string;
}

export function normalBalanceFor(type: AccountType): NormalBalance {
  switch (type) {
    case "ASSET":
    case "EXPENSE":
      return "DEBIT";
    case "LIABILITY":
    case "EQUITY":
    case "INCOME":
      return "CREDIT";
  }
}

export const DEFAULT_CHART_OF_ACCOUNTS = chartOfAccountsJson as DefaultAccount[];
