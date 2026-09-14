import { getCompanyId, ok, parseRange, unauthorized } from "@/lib/server/api";
import {
  buildBalanceSheet,
  computeAccountBalances,
} from "@/lib/accounting/reports";

export async function GET(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const range = parseRange(req);
  const balances = await computeAccountBalances(companyId, range);

  return ok(buildBalanceSheet(balances));
}
