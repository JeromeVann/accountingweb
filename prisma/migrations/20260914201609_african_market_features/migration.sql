-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'M_PESA', 'MTN_MOMO', 'AIRTEL_MONEY', 'ORANGE_MONEY', 'FLUTTERWAVE', 'CARD', 'OTHER');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "tax_id" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "payment_method" "PaymentMethod";
