import { Prisma } from "@prisma/client";

export interface PayrollBreakdown {
  paye: Prisma.Decimal;
  nhif: Prisma.Decimal;
  nssf: Prisma.Decimal;
  netPay: Prisma.Decimal;
}

const ZERO = new Prisma.Decimal(0);

/**
 * Simplified Kenyan statutory deductions (2024 rates).
 *
 * - PAYE: 10% on the first 24,000; 25% on the next 8,333; 30% above, less a
 *   2,400 monthly personal relief.
 * - NHIF: 2.75% of gross, capped at 1,700 per month.
 * - NSSF: 6% of gross (Tier I/II simplified).
 *
 * These are illustrative defaults — amounts can be overridden when recording a
 * payroll run.
 */
export function computeKenyanPayroll(gross: Prisma.Decimal): PayrollBreakdown {
  const personalRelief = new Prisma.Decimal(2400);
  const band1 = new Prisma.Decimal(24000);
  const band2 = new Prisma.Decimal(8333);

  let tax = ZERO;
  let remaining = gross;

  const first = remaining.lessThan(band1) ? remaining : band1;
  tax = tax.plus(first.mul(0.1));
  remaining = remaining.minus(first);

  if (remaining.greaterThan(0)) {
    const second = remaining.lessThan(band2) ? remaining : band2;
    tax = tax.plus(second.mul(0.25));
    remaining = remaining.minus(second);
  }

  if (remaining.greaterThan(0)) {
    tax = tax.plus(remaining.mul(0.3));
  }

  let paye = tax.minus(personalRelief);
  if (paye.lessThan(0)) paye = ZERO;

  const nhifRaw = gross.mul(0.0275);
  const nhif = nhifRaw.greaterThan(1700) ? new Prisma.Decimal(1700) : nhifRaw;

  const nssf = gross.mul(0.06);

  const netPay = gross.minus(paye).minus(nhif).minus(nssf);

  return { paye, nhif, nssf, netPay };
}
