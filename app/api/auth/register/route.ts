import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import {
  DEFAULT_CHART_OF_ACCOUNTS,
  normalBalanceFor,
} from "@/lib/accounting/chart-of-accounts";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Invalid input",
        },
        { status: 400 },
      );
    }

    const { name, email, password, companyName, industry } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);
    const fiscalYearStart = new Date(new Date().getFullYear(), 0, 1);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          legalName: companyName,
          fiscalYearStart,
          industry: industry ?? null,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          companyId: company.id,
          role: "ADMIN",
        },
      });

      await tx.account.createMany({
        data: DEFAULT_CHART_OF_ACCOUNTS.map((account) => ({
          companyId: company.id,
          code: account.code,
          name: account.name,
          type: account.type,
          normalBalance: normalBalanceFor(account.type),
          description: account.description,
        })),
      });

      return { user, company };
    });

    return NextResponse.json(
      {
        success: true,
        data: { userId: result.user.id, companyId: result.company.id },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
