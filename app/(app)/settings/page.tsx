import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompanyForm } from "@/components/settings/company-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
  });

  const accountCount = await prisma.account.count({
    where: { companyId: session.user.companyId },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Company and account details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Legal name" value={company?.legalName ?? "—"} />
          <Row
            label="Fiscal year start"
            value={company ? formatDate(company.fiscalYearStart) : "—"}
          />
          <Row label="Industry" value={company?.industry ?? "—"} />
          <Row label="Chart of accounts" value={`${accountCount} accounts`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing &amp; tax</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Name" value={session.user.name ?? "—"} />
          <Row label="Email" value={session.user.email ?? "—"} />
          <Row label="Role" value={session.user.role} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
