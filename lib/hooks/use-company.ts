"use client";

import { useQuery } from "@tanstack/react-query";

export interface CompanyInfo {
  id: string;
  legalName: string;
  currency: string;
  taxId: string | null;
}

export function useCompany() {
  return useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const res = await fetch("/api/company");
      const json = await res.json();
      return json.data as CompanyInfo;
    },
    staleTime: 5 * 60_000,
  });
}
