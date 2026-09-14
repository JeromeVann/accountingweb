import { z } from "zod";

export const journalEntryLineSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  amount: z.coerce.number().finite().positive("Amount must be positive"),
  type: z.enum(["DEBIT", "CREDIT"]),
});

export const journalEntryCreateSchema = z.object({
  date: z.coerce.date(),
  reference: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
  lines: z
    .array(journalEntryLineSchema)
    .min(2, "A journal entry requires at least two lines"),
});

export type JournalEntryCreateInput = z.infer<typeof journalEntryCreateSchema>;
