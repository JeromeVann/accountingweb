import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import {
  DEFAULT_CHART_OF_ACCOUNTS,
  normalBalanceFor,
} from "../lib/accounting/chart-of-accounts";

const prisma = new PrismaClient();

async function seedCompanyAccounts(companyId: string) {
  const existing = await prisma.account.count({ where: { companyId } });
  if (existing > 0) return 0;

  await prisma.account.createMany({
    data: DEFAULT_CHART_OF_ACCOUNTS.map((account) => ({
      companyId,
      code: account.code,
      name: account.name,
      type: account.type,
      normalBalance: normalBalanceFor(account.type),
      description: account.description,
    })),
  });

  return DEFAULT_CHART_OF_ACCOUNTS.length;
}

async function main() {
  const companies = await prisma.company.findMany();

  if (companies.length === 0) {
    const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD ?? "password123";
    const companyName = process.env.SEED_COMPANY_NAME ?? "Demo Company";

    const passwordHash = await hash(password, 12);

    const company = await prisma.company.create({
      data: {
        legalName: companyName,
        fiscalYearStart: new Date(new Date().getFullYear(), 0, 1),
        users: {
          create: {
            name: "Demo Admin",
            email,
            passwordHash,
            role: "ADMIN",
          },
        },
      },
    });

    const created = await seedCompanyAccounts(company.id);
    console.log(`Created demo company "${companyName}" (${email}) with ${created} accounts.`);
    return;
  }

  let total = 0;
  for (const company of companies) {
    const created = await seedCompanyAccounts(company.id);
    if (created > 0) {
      console.log(`Seeded ${created} accounts for "${company.legalName}".`);
    }
    total += created;
  }

  if (total === 0) {
    console.log("All companies already have a chart of accounts. Nothing to seed.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
