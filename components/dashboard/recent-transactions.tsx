import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";

interface TransactionLine {
  type: "DEBIT" | "CREDIT";
  amount: number;
  account: { name: string };
}

export interface TransactionEntry {
  date: string;
  description: string | null;
  reference: string | null;
  lines: TransactionLine[];
}

export function RecentTransactions({
  entries,
  currency,
}: {
  entries: TransactionEntry[];
  currency: string;
}) {
  const rows = entries.flatMap((entry) =>
    entry.lines.map((line) => ({
      date: entry.date,
      description: entry.description ?? entry.reference ?? "—",
      account: line.account.name,
      debit: line.type === "DEBIT" ? line.amount : null,
      credit: line.type === "CREDIT" ? line.amount : null,
    })),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Latest journal entries across your accounts</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transactions yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(row.date)}
                  </TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.account}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.debit != null ? formatCurrency(row.debit, currency) : ""}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.credit != null ? formatCurrency(row.credit, currency) : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
