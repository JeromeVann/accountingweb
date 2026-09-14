export interface Option {
  value: string;
  label: string;
}

export const CURRENCIES: Option[] = [
  { value: "KES", label: "Kenyan Shilling (KES)" },
  { value: "GHS", label: "Ghanaian Cedi (GHS)" },
  { value: "NGN", label: "Nigerian Naira (NGN)" },
  { value: "ZAR", label: "South African Rand (ZAR)" },
  { value: "XOF", label: "CFA Franc (XOF)" },
];

export const PAYMENT_METHODS: Option[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "M_PESA", label: "M-Pesa" },
  { value: "MTN_MOMO", label: "MTN Mobile Money" },
  { value: "AIRTEL_MONEY", label: "Airtel Money" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "FLUTTERWAVE", label: "Flutterwave" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
];

export function paymentMethodLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}
