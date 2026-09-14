-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "expense_account_id" TEXT;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_expense_account_id_fkey" FOREIGN KEY ("expense_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
