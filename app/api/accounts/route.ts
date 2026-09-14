import { prisma } from "@/lib/prisma";
import { getCompanyId, ok, unauthorized } from "@/lib/server/api";

export async function GET() {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const accounts = await prisma.account.findMany({
    where: { companyId },
    orderBy: { code: "asc" },
  });

  return ok(accounts);
}
