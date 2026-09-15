import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moneyToNumber } from "@/lib/accounting/money";
import {
  buildProfitLoss,
  computeAccountBalances,
} from "@/lib/accounting/reports";
import { serializeJournalEntry } from "@/lib/serializers";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = session.user.companyId;
  const t = await getTranslations("dashboard");

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { currency: true },
  });
  const currency = company?.currency ?? "KES";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const balances = await computeAccountBalances(companyId, { from: monthStart });
  const profitLoss = buildProfitLoss(balances);

  const accountsReceivable = await prisma.invoice.aggregate({
    where: { companyId, status: { in: ["SENT", "OVERDUE"] } },
    _sum: { totalAmount: true },
  });

  const recentEntries = await prisma.journalEntry.findMany({
    where: { companyId },
    orderBy: { date: "desc" },
    take: 10,
    include: { lines: { include: { account: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("welcome", { name: session.user.name ?? "" })}
        </p>
      </div>

      <MetricCards
        revenue={profitLoss.revenue}
        expenses={profitLoss.expenses}
        netProfit={profitLoss.netProfit}
        accountsReceivable={moneyToNumber(accountsReceivable._sum.totalAmount)}
        currency={currency}
      />

      <RecentTransactions
        entries={recentEntries.map(serializeJournalEntry)}
        currency={currency}
      />
    </div>
  );
}
