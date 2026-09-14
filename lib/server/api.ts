import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AccountingError } from "@/lib/accounting/double-entry";

export async function getCompanyId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.companyId ?? null;
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function unauthorized() {
  return fail("Unauthorized", 401);
}

export function parseRange(req: Request): { from?: Date; to?: Date } {
  const url = new URL(req.url);
  const range: { from?: Date; to?: Date } = {};

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const asOf = url.searchParams.get("asOf");

  const parse = (value: string | null) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };

  range.from = parse(from);
  range.to = parse(to);
  if (!range.to) range.to = parse(asOf);

  return range;
}

export function handleError(error: unknown) {
  if (error instanceof AccountingError) {
    return fail(error.message, 400);
  }
  console.error("[api] error:", error);
  return fail("Something went wrong. Please try again.", 500);
}
