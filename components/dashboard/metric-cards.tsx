import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

interface MetricCardsProps {
  revenue: number;
  expenses: number;
  netProfit: number;
  accountsReceivable: number;
  currency: string;
}

export function MetricCards({
  revenue,
  expenses,
  netProfit,
  accountsReceivable,
  currency,
}: MetricCardsProps) {
  const metrics = [
    {
      title: "Total Revenue (MTD)",
      value: formatCurrency(revenue, currency),
      tone: "text-emerald-600",
    },
    {
      title: "Total Expenses (MTD)",
      value: formatCurrency(expenses, currency),
      tone: "text-rose-600",
    },
    {
      title: "Net Profit",
      value: formatCurrency(netProfit, currency),
      tone: netProfit >= 0 ? "text-emerald-600" : "text-rose-600",
    },
    {
      title: "Accounts Receivable",
      value: formatCurrency(accountsReceivable, currency),
      tone: "text-blue-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${metric.tone}`}>
              {metric.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
