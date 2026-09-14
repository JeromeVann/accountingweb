import { prisma } from "@/lib/prisma";
import { getCompanyId, handleError, ok, unauthorized } from "@/lib/server/api";
import { serializeCompany } from "@/lib/serializers";
import { companyUpdateSchema } from "@/lib/validations/company";

export async function GET() {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return unauthorized();

  return ok(serializeCompany(company));
}

export async function PUT(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const parsed = companyUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { currency, taxId } = parsed.data;

  try {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        currency: currency.toUpperCase(),
        taxId: taxId ? taxId : null,
      },
    });

    return ok(serializeCompany(company));
  } catch (error) {
    return handleError(error);
  }
}
