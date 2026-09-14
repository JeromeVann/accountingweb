import { z } from "zod";

export const companyUpdateSchema = z.object({
  currency: z.string().trim().length(3, "Currency code must be 3 letters"),
  taxId: z.string().trim().max(50).optional(),
});

export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
