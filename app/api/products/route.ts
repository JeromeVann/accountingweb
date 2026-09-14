import { prisma } from "@/lib/prisma";
import { getCompanyId, handleError, ok, unauthorized } from "@/lib/server/api";
import { toMoneyDecimal, moneyToNumber } from "@/lib/accounting/money";
import { productCreateSchema } from "@/lib/validations/product";

export async function GET() {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const products = await prisma.productService.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });

  return ok(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      unitPrice: moneyToNumber(p.unitPrice),
      taxable: p.taxable,
    })),
  );
}

export async function POST(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const parsed = productCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { name, unitPrice, taxable } = parsed.data;

  try {
    const product = await prisma.productService.create({
      data: {
        companyId,
        name,
        unitPrice: toMoneyDecimal(unitPrice),
        taxable: taxable ?? false,
      },
    });

    return ok(
      {
        id: product.id,
        name: product.name,
        unitPrice: moneyToNumber(product.unitPrice),
        taxable: product.taxable,
      },
      201,
    );
  } catch (error) {
    return handleError(error);
  }
}
