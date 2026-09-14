import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyId, handleError, ok, unauthorized } from "@/lib/server/api";
import { toMoneyDecimal } from "@/lib/accounting/money";
import { serializeContact } from "@/lib/serializers";
import { contactCreateSchema } from "@/lib/validations/contact";
import type { ContactType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const type = req.nextUrl.searchParams.get("type");

  const contacts = await prisma.contact.findMany({
    where: {
      companyId,
      ...(type === "CUSTOMER" || type === "VENDOR"
        ? { type: type as ContactType }
        : {}),
    },
    orderBy: { displayName: "asc" },
  });

  return ok(contacts.map(serializeContact));
}

export async function POST(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const parsed = contactCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { type, displayName, email, phone, billingAddress, openingBalance } =
    parsed.data;

  try {
    const contact = await prisma.contact.create({
      data: {
        companyId,
        type,
        displayName,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        billingAddress: billingAddress || null,
        openingBalance:
          openingBalance != null ? toMoneyDecimal(openingBalance) : 0,
      },
    });

    return ok(serializeContact(contact), 201);
  } catch (error) {
    return handleError(error);
  }
}
