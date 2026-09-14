import { z } from "zod";

export const billLineItemSchema = z.object({
  description: z.string().max(500).optional(),
  quantity: z.number().finite().min(0),
  unitPrice: z.number().finite().min(0),
});

export const billCreateSchema = z.object({
  contactId: z.string().min(1, "Vendor is required"),
  expenseAccountId: z.string().min(1, "Expense account is required"),
  billDate: z.string().min(1, "Bill date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  lineItems: z
    .array(billLineItemSchema)
    .min(1, "At least one line item is required"),
});

export type BillCreateInput = z.infer<typeof billCreateSchema>;
