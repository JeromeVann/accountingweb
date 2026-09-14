import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildBalanceSheet,
  buildProfitLoss,
  buildTrialBalance,
  computeAccountBalances,
  type TrialBalanceRow,
} from "@/lib/accounting/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { currency: true },
  });
  const currency = company?.currency ?? "KES";

  const balances = await computeAccountBalances(session.user.companyId);
  const profitLoss = buildProfitLoss(balances);
  const balanceSheet = buildBalanceSheet(balances);
  const trialBalance = buildTrialBalance(balances);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Financial statements for your company
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profit &amp; Loss</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <Metric label="Revenue" value={profitLoss.revenue} tone="text-emerald-600" currency={currency} />
              <Metric label="Expenses" value={profitLoss.expenses} tone="text-rose-600" currency={currency} />
              <Metric
                label="Net profit"
                value={profitLoss.netProfit}
                tone={profitLoss.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}
                currency={currency}
              />
            </div>
            <AccountList
              title="Income"
              rows={profitLoss.revenueAccounts}
              sign="credit"
              currency={currency}
            />
            <AccountList
              title="Expenses"
              rows={profitLoss.expenseAccounts}
              sign="debit"
              currency={currency}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balance Sheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <SectionRow
                label="Total Assets"
                value={balanceSheet.assets.total}
                currency={currency}
              />
              <SectionRow
                label="Total Liabilities"
                value={balanceSheet.liabilities.total}
                currency={currency}
              />
              <SectionRow label="Total Equity" value={balanceSheet.equity.total} currency={currency} />
              <SectionRow
                label="Liabilities + Equity"
                value={balanceSheet.liabilities.total + balanceSheet.equity.total}
                strong
                currency={currency}
              />
            </div>
            <AccountList
              title="Assets"
              rows={balanceSheet.assets.accounts}
              sign="debit"
              currency={currency}
            />
            <AccountList
              title="Liabilities"
              rows={balanceSheet.liabilities.accounts}
              sign="credit"
              currency={currency}
            />
            <AccountList
              title="Equity"
              rows={balanceSheet.equity.accounts}
              sign="credit"
              currency={currency}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trial Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trialBalance.rows.map((row) => (
                <TableRow key={row.accountId}>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.type}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.debits ? formatCurrency(row.debits, currency) : ""}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.credits ? formatCurrency(row.credits, currency) : ""}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold">
                <TableCell colSpan={3}>Totals</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(trialBalance.totalDebits, currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(trialBalance.totalCredits, currency)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  currency,
}: {
  label: string;
  value: number;
  tone: string;
  currency: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${tone}`}>
        {formatCurrency(value, currency)}
      </p>
    </div>
  );
}

function SectionRow({
  label,
  value,
  strong,
  currency,
}: {
  label: string;
  value: number;
  strong?: boolean;
  currency: string;
}) {
  return (
    <div className="flex justify-between border-b border-border/60 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${strong ? "font-semibold" : "font-medium"}`}>
        {formatCurrency(value, currency)}
      </span>
    </div>
  );
}

function AccountList({
  title,
  rows,
  sign,
  currency,
}: {
  title: string;
  rows: TrialBalanceRow[];
  sign: "debit" | "credit";
  currency: string;
}) {
  if (rows.length === 0) return null;

  const amount = (row: TrialBalanceRow) =>
    sign === "credit" ? row.credits - row.debits : row.debits - row.credits;

  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1 text-sm">
        {rows.map((row) => (
          <div key={row.accountId} className="flex justify-between">
            <span>{row.name}</span>
            <span className="tabular-nums">{formatCurrency(amount(row), currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
