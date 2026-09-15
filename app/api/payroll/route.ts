import { prisma } from "@/lib/prisma";
import { getCompanyId, handleError, ok, unauthorized } from "@/lib/server/api";
import { createPayrollJournalEntry } from "@/lib/accounting/double-entry";
import { toMoneyDecimal, moneyToNumber } from "@/lib/accounting/money";
import { payrollCreateSchema } from "@/lib/validations/payroll";

export async function GET() {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const runs = await prisma.payrollRun.findMany({
    where: { companyId },
    orderBy: { payDate: "desc" },
  });

  return ok(
    runs.map((run) => ({
      id: run.id,
      employeeName: run.employeeName,
      payDate: run.payDate.toISOString(),
      grossSalary: moneyToNumber(run.grossSalary),
      paye: moneyToNumber(run.paye),
      nhif: moneyToNumber(run.nhif),
      nssf: moneyToNumber(run.nssf),
      netPay: moneyToNumber(run.netPay),
    })),
  );
}

export async function POST(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) return unauthorized();

  const parsed = payrollCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { employeeName, payDate, grossSalary, paye, nhif, nssf } = parsed.data;

  const payDateObj = new Date(payDate);
  if (Number.isNaN(payDateObj.getTime())) {
    return Response.json(
      { success: false, error: "Invalid pay date" },
      { status: 400 },
    );
  }

  const gross = toMoneyDecimal(grossSalary);
  const payeDec = toMoneyDecimal(paye);
  const nhifDec = toMoneyDecimal(nhif);
  const nssfDec = toMoneyDecimal(nssf);

  const deductions = payeDec.plus(nhifDec).plus(nssfDec);
  if (deductions.greaterThan(gross)) {
    return Response.json(
      { success: false, error: "Deductions cannot exceed gross salary" },
      { status: 400 },
    );
  }

  const netPay = gross.minus(deductions);
  const reference = `PAY-${payDateObj.getFullYear()}-${String(Date.now()).slice(-5)}`;

  try {
    const run = await prisma.$transaction(async (tx) => {
      const created = await tx.payrollRun.create({
        data: {
          companyId,
          employeeName,
          payDate: payDateObj,
          grossSalary: gross,
          paye: payeDec,
          nhif: nhifDec,
          nssf: nssfDec,
          netPay,
        },
      });

      const journalEntry = await createPayrollJournalEntry(tx, companyId, {
        date: payDateObj,
        reference,
        description: `Payroll — ${employeeName}`,
        grossSalary: gross,
        paye: payeDec,
        nhif: nhifDec,
        nssf: nssfDec,
        netPay,
      });

      return tx.payrollRun.update({
        where: { id: created.id },
        data: { journalEntryId: journalEntry.id },
      });
    });

    return ok(
      {
        id: run.id,
        employeeName: run.employeeName,
        payDate: run.payDate.toISOString(),
        grossSalary: moneyToNumber(run.grossSalary),
        paye: moneyToNumber(run.paye),
        nhif: moneyToNumber(run.nhif),
        nssf: moneyToNumber(run.nssf),
        netPay: moneyToNumber(run.netPay),
      },
      201,
    );
  } catch (error) {
    return handleError(error);
  }
}
