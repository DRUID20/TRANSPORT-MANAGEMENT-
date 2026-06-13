import { z } from "zod";

const currencyEnum = z.enum(["KES", "USD", "UGX"]);

export const employeeCreateSchema = z.object({
  employeeNumber: z.string().min(1, "Employee number required"),
  fullName: z.string().min(2, "Full name required"),
  preferredName: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  dob: z.string().optional(),
  nationalId: z.string().min(4, "National ID required"),
  kraPin: z.string().optional(),
  nssfNo: z.string().optional(),
  shaNo: z.string().optional(),
  mpesaPhone: z.string().min(10, "M-Pesa phone required"),
  alternatePhone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  physicalAddress: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  bankAccountNo: z.string().optional(),
  bankAccountName: z.string().optional(),
  hireDate: z.string().min(1, "Hire date required"),
  status: z.enum(["active", "probation", "on_leave", "suspended", "terminated"]).default("active"),
  departmentId: z.string().min(1, "Department required"),
  jobTitle: z.string().min(2, "Job title required"),
  lineManagerId: z.string().optional(),
  driverId: z.string().optional(),
  notes: z.string().optional(),
});
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

export const departmentCreateSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(8),
  headEmployeeId: z.string().optional(),
  parentDepartmentId: z.string().optional(),
  costCentre: z.string().optional(),
  description: z.string().optional(),
});
export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;

export const allowanceSchema = z.object({
  name: z.string().min(1),
  amount: z.coerce.number().nonnegative(),
  taxable: z.boolean().default(true),
});

export const contractCreateSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum(["permanent", "fixed_term", "casual", "consultant", "intern"]),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  probationEndDate: z.string().optional(),
  noticePeriodDays: z.coerce.number().int().nonnegative().default(30),
  basicSalary: z.coerce.number().positive(),
  currency: currencyEnum.default("KES"),
  payFrequency: z.enum(["monthly", "biweekly", "weekly"]).default("monthly"),
  allowances: z.array(allowanceSchema).default([]),
  notes: z.string().optional(),
});
export type ContractCreateInput = z.infer<typeof contractCreateSchema>;
