"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CURRENCIES } from "@/lib/options";
import { useCompany } from "@/lib/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CompanyForm() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const [currency, setCurrency] = useState("KES");
  const [taxId, setTaxId] = useState("");

  useEffect(() => {
    if (company) {
      setCurrency(company.currency);
      setTaxId(company.taxId ?? "");
    }
  }, [company]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, taxId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["company"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Currency</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="taxId">Tax ID / Registration number</Label>
        <Input
          id="taxId"
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
          placeholder="e.g. KRA PIN, TIN, VAT number"
        />
        <p className="text-xs text-muted-foreground">
          Shown on your invoices.
        </p>
      </div>

      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
