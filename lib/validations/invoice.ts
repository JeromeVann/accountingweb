import { z } from "zod";

export const invoiceLineItemSchema = z.object({
  productServiceId: z.string().min(1).optional(),
  description: z.string().max(500).optional(),
  quantity: z.number().finite().min(0),
  unitPrice: z.number().finite().min(0),
});

export const invoiceCreateSchema = z.object({
  contactId: z.string().min(1, "Customer is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  memo: z.string().max(1000).optional(),
  taxRate: z.number().finite().min(0).max(100).optional(),
  pricesIncludeTax: z.boolean().optional(),
  withholdingTaxRate: z.number().finite().min(0).max(100).optional(),
  lineItems: z
    .array(invoiceLineItemSchema)
    .min(1, "At least one line item is required"),
});

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
