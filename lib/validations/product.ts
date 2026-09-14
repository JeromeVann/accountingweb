import { z } from "zod";

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  unitPrice: z.coerce.number().finite().nonnegative(),
  taxable: z.boolean().optional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
