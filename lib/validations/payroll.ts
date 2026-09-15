import { z } from "zod";

export const payrollCreateSchema = z.object({
  employeeName: z.string().trim().min(1, "Employee name is required").max(200),
  payDate: z.string().min(1, "Pay date is required"),
  grossSalary: z.number().finite().min(0),
  paye: z.number().finite().min(0),
  nhif: z.number().finite().min(0),
  nssf: z.number().finite().min(0),
});

export type PayrollCreateInput = z.infer<typeof payrollCreateSchema>;
