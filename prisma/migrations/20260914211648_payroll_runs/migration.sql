-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "pay_date" TIMESTAMP(3) NOT NULL,
    "gross_salary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paye" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "nhif" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "nssf" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "journal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_journal_entry_id_key" ON "payroll_runs"("journal_entry_id");

-- CreateIndex
CREATE INDEX "payroll_runs_company_id_pay_date_idx" ON "payroll_runs"("company_id", "pay_date");

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
