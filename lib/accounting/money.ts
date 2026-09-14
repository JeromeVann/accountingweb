import { Prisma } from "@prisma/client";

export function toMoneyDecimal(value: number | string | Prisma.Decimal): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) {
    return value.toDecimalPlaces(2);
  }
  if (typeof value === "number") {
    return new Prisma.Decimal(value.toFixed(2));
  }
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

export function moneyToNumber(
  value: Prisma.Decimal | number | string | null | undefined,
): number {
  if (value == null) return 0;
  return Number(value);
}

export function sumMoney(
  values: Array<Prisma.Decimal | number | string>,
): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (acc, value) => acc.plus(toMoneyDecimal(value)),
    new Prisma.Decimal(0),
  );
}
