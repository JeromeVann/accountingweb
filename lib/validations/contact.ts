import { z } from "zod";

export const contactCreateSchema = z.object({
  type: z.enum(["CUSTOMER", "VENDOR"]),
  displayName: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(50).optional(),
  billingAddress: z.string().max(500).optional(),
  openingBalance: z.coerce.number().finite().optional(),
});

export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
