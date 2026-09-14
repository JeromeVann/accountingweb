import { Card, CardContent } from "@/components/ui/card";

export default function BankingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Banking</h1>
        <p className="text-sm text-muted-foreground">
          Reconcile your bank accounts
        </p>
      </div>
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          Bank reconciliation is coming in a future step.
        </CardContent>
      </Card>
    </div>
  );
}
