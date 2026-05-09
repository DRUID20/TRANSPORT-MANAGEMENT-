/**
 * HR — Phase 6A.
 * Employee master record (all staff: drivers + office), Departments,
 * and Employment Contracts.
 */

import type { Currency } from "@/lib/types/ledger";

export type EmployeeStatus =
  | "active"
  | "probation"
  | "on_leave"
  | "suspended"
  | "terminated";

export type Gender = "male" | "female" | "other";

export interface Employee {
  id: string;
  /** Sequential staff number, e.g. NVL-001. */
  employeeNumber: string;
  fullName: string;
  preferredName?: string;
  gender?: Gender;
  dob?: string;                       // ISO date
  nationalId: string;
  kraPin?: string;                    // Kenya Revenue Authority PIN
  /** NSSF No (National Social Security Fund). */
  nssfNo?: string;
  /** SHA No (Social Health Authority — replaces NHIF since 2024). */
  shaNo?: string;
  /** Phone used for M-Pesa payroll dispatch. */
  mpesaPhone: string;
  alternatePhone?: string;
  email?: string;
  physicalAddress?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  hireDate: string;                   // ISO date
  terminationDate?: string;
  status: EmployeeStatus;
  departmentId: string;
  jobTitle: string;
  /** Reports-to relationship. */
  lineManagerId?: string;
  /** Linked driver record if this employee drives trucks. */
  driverId?: string;
  photoUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  /** Short code, e.g. OPS, FIN, HR, WSP. */
  code: string;
  /** Employee that heads the department. */
  headEmployeeId?: string;
  /** Parent department for hierarchical structures. */
  parentDepartmentId?: string;
  /** Cost-centre code (drives cost allocation in Finance). */
  costCentre?: string;
  description?: string;
}

export type ContractType =
  | "permanent"
  | "fixed_term"
  | "casual"
  | "consultant"
  | "intern";

export type PayFrequency = "monthly" | "biweekly" | "weekly";

export type ContractStatus = "active" | "expired" | "terminated" | "draft";

export interface ContractAllowance {
  name: string;             // "House", "Transport", "Acting", etc.
  amount: number;           // in contract currency
  taxable: boolean;
}

export interface Contract {
  id: string;
  employeeId: string;
  type: ContractType;
  startDate: string;
  /** End date for fixed-term contracts. */
  endDate?: string;
  /** Probation end date — staff on probation may have different rules. */
  probationEndDate?: string;
  noticePeriodDays: number;
  basicSalary: number;
  currency: Currency;
  payFrequency: PayFrequency;
  allowances: ContractAllowance[];
  /** Reference to a stored contract document. */
  documentUrl?: string;
  status: ContractStatus;
  notes?: string;
  createdAt: string;
}
