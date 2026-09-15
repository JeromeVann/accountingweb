-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "prices_include_tax" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "withholding_tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "withholding_tax_rate" DECIMAL(15,2) NOT NULL DEFAULT 0;
