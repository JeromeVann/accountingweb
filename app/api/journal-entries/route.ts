import { prisma } from "@/lib/prisma";
import { getCompanyId, handleError, ok, unauthorized } from "@/lib/server/api";
import { createJournalEntry } from "@/lib/accounting/double-entry";
import { toMoneyDecimal } from "@/lib/accounting/money";
import { serializeJournalEntry } from "@/lib/serializers";
import { journalEntryCreateSchema } from "@/lib/validations/journal-entry";

export async function POST(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const parsed = journalEntryCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { date, reference, description, lines } = parsed.data;

  const accountIds = [...new Set(lines.map((l) => l.accountId))];
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds }, companyId },
    select: { id: true },
  });

  if (accounts.length !== accountIds.length) {
    return Response.json(
      { success: false, error: "One or more accounts are invalid for this company" },
      { status: 400 },
    );
  }

  try {
    const entry = await createJournalEntry(prisma, {
      companyId,
      date,
      reference: reference || null,
      description: description || null,
      lines: lines.map((l) => ({
        accountId: l.accountId,
        amount: toMoneyDecimal(l.amount),
        type: l.type,
      })),
    });

    return ok(serializeJournalEntry(entry), 201);
  } catch (error) {
    return handleError(error);
  }
}
