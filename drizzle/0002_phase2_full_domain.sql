CREATE TABLE "appraisal_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"label" text NOT NULL,
	"year" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" varchar(12) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appraisal_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"manager_id" uuid,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"competencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overall_rating" integer,
	"employee_comment" text,
	"manager_comment" text,
	"hr_comment" text,
	"status" varchar(16) DEFAULT 'not_started' NOT NULL,
	"recommendation" varchar(16),
	"proposed_increment_pct" numeric(5, 2),
	"submitted_at" timestamp with time zone,
	"manager_reviewed_at" timestamp with time zone,
	"hr_finalised_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"date" date NOT NULL,
	"status" varchar(16) NOT NULL,
	"clock_in_time" varchar(8),
	"clock_out_time" varchar(8),
	"hours" numeric(5, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_statement_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"account_code" varchar(16) NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"reference" varchar(64),
	"debit" numeric(18, 4) DEFAULT '0' NOT NULL,
	"credit" numeric(18, 4) DEFAULT '0' NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" varchar(12) DEFAULT 'unmatched' NOT NULL,
	"matched_journal_line_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"unit" varchar(16),
	"unit_price" numeric(18, 6) NOT NULL,
	"line_total" numeric(18, 4) NOT NULL,
	"expense_account_code" varchar(16) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" varchar(24) NOT NULL,
	"customer_id" uuid NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"product" varchar(8),
	"cargo_type" text NOT NULL,
	"cargo_quantity" numeric(14, 2) NOT NULL,
	"cargo_unit" varchar(12) DEFAULT 'litres' NOT NULL,
	"requested_date" date NOT NULL,
	"agreed_amount" numeric(18, 4) NOT NULL,
	"agreed_basis" varchar(16) NOT NULL,
	"agreed_currency" varchar(3) NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"trip_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "border_crossings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"trip_id" uuid NOT NULL,
	"post_name" text NOT NULL,
	"country_from" varchar(2) NOT NULL,
	"country_to" varchar(2) NOT NULL,
	"status" varchar(16) DEFAULT 'queued' NOT NULL,
	"arrived_at" timestamp with time zone,
	"cleared_at" timestamp with time zone,
	"axle_load_kg" integer,
	"transit_permit_number" varchar(64),
	"charges_kes" numeric(14, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"kind" varchar(32) NOT NULL,
	"label" text,
	"number" varchar(64),
	"issue_date" date,
	"expiry_date" date,
	"issuing_authority" text,
	"attachment_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" varchar(24) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"probation_end_date" date,
	"notice_period_days" integer DEFAULT 30 NOT NULL,
	"basic_salary" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'KES' NOT NULL,
	"pay_frequency" varchar(12) DEFAULT 'monthly' NOT NULL,
	"allowances" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"document_url" text,
	"status" varchar(12) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" varchar(24) NOT NULL,
	"customer_id" uuid NOT NULL,
	"trip_id" uuid,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"currency" varchar(3) NOT NULL,
	"fx_rate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"subtotal" numeric(18, 4) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(6, 3) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"total" numeric(18, 4) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"balance" numeric(18, 4) DEFAULT '0' NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"journal_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" varchar(24) NOT NULL,
	"invoice_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(18, 4) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"fx_rate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"payment_method" varchar(12) NOT NULL,
	"reference" varchar(64),
	"journal_entry_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" varchar(16) NOT NULL,
	"head_employee_id" uuid,
	"parent_department_id" uuid,
	"cost_centre" varchar(16),
	"description" text
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_number" varchar(24) NOT NULL,
	"full_name" text NOT NULL,
	"preferred_name" text,
	"gender" varchar(8),
	"dob" date,
	"national_id" varchar(32) NOT NULL,
	"kra_pin" varchar(32),
	"nssf_no" varchar(32),
	"sha_no" varchar(32),
	"mpesa_phone" varchar(32) NOT NULL,
	"alternate_phone" varchar(32),
	"email" text,
	"physical_address" text,
	"emergency_contact_name" text,
	"emergency_contact_relationship" varchar(32),
	"emergency_contact_phone" varchar(32),
	"bank_name" text,
	"bank_branch" text,
	"bank_account_no" varchar(64),
	"bank_account_name" text,
	"hire_date" date NOT NULL,
	"termination_date" date,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"department_id" uuid NOT NULL,
	"job_title" text NOT NULL,
	"line_manager_id" uuid,
	"driver_id" uuid,
	"photo_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" varchar(24) NOT NULL,
	"amount_kes" numeric(18, 4) NOT NULL,
	"original_amount" numeric(18, 4),
	"original_currency" varchar(3),
	"category" varchar(32) NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"country_code" varchar(2),
	"incurred_at" timestamp with time zone NOT NULL,
	"paid_by" varchar(16) NOT NULL,
	"trip_id" uuid,
	"truck_id" uuid,
	"driver_id" uuid,
	"supplier_id" uuid,
	"receipt_document_id" uuid,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"submitted_by" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"reimbursed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fuel_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" varchar(24) NOT NULL,
	"trip_id" uuid,
	"truck_id" uuid NOT NULL,
	"driver_id" uuid,
	"datetime" timestamp with time zone NOT NULL,
	"station" text NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"litres" numeric(12, 2) NOT NULL,
	"cost_kes" numeric(14, 2) NOT NULL,
	"price_per_litre_kes" numeric(10, 4) NOT NULL,
	"odometer_km" integer NOT NULL,
	"paid_by" varchar(16) NOT NULL,
	"expense_id" uuid,
	"submitted_by" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"unit" varchar(16),
	"unit_price" numeric(18, 6) NOT NULL,
	"line_total" numeric(18, 4) NOT NULL,
	"revenue_account_code" varchar(16)
);
--> statement-breakpoint
CREATE TABLE "jd_assignments" (
	"employee_id" uuid NOT NULL,
	"job_description_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jd_assignments_employee_id_job_description_id_pk" PRIMARY KEY("employee_id","job_description_id")
);
--> statement-breakpoint
CREATE TABLE "job_card_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_card_id" uuid NOT NULL,
	"description" text NOT NULL,
	"hours" numeric(6, 2) NOT NULL,
	"cost_kes" numeric(14, 2) NOT NULL,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_card_spares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_card_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit_cost_kes" numeric(14, 4) NOT NULL,
	"total_cost_kes" numeric(14, 2) NOT NULL,
	"supplier_id" uuid,
	"posted" boolean DEFAULT false NOT NULL,
	"posted_at" timestamp with time zone,
	"consumed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" varchar(24) NOT NULL,
	"truck_id" uuid NOT NULL,
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"mechanic_name" text NOT NULL,
	"opening_odometer" integer,
	"closing_odometer" integer,
	"mechanic_analysis" text NOT NULL,
	"notes" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"labor_total_kes" numeric(14, 2) DEFAULT '0' NOT NULL,
	"spares_total_kes" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_kes" numeric(14, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_descriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"department_id" uuid,
	"summary" text,
	"responsibilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"grade" varchar(16),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" varchar(24) NOT NULL,
	"date" date NOT NULL,
	"memo" text NOT NULL,
	"reference_type" varchar(16) DEFAULT 'manual' NOT NULL,
	"reference_id" varchar(64),
	"status" varchar(12) DEFAULT 'draft' NOT NULL,
	"posted_by" text NOT NULL,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reversal_of" uuid,
	"reversed_by_id" uuid,
	"total_debit_kes" numeric(18, 4) DEFAULT '0' NOT NULL,
	"total_credit_kes" numeric(18, 4) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"account_code" varchar(16) NOT NULL,
	"account_name" text NOT NULL,
	"original_debit" numeric(18, 4) DEFAULT '0' NOT NULL,
	"original_credit" numeric(18, 4) DEFAULT '0' NOT NULL,
	"currency" varchar(3) DEFAULT 'KES' NOT NULL,
	"fx_rate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"debit_kes" numeric(18, 4) DEFAULT '0' NOT NULL,
	"credit_kes" numeric(18, 4) DEFAULT '0' NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" varchar(24) NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type" varchar(16) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"days" numeric(6, 2) NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(12) DEFAULT 'pending' NOT NULL,
	"attachment_url" text,
	"approved_by_id" uuid,
	"approved_at" timestamp with time zone,
	"rejected_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" varchar(24) NOT NULL,
	"employee_id" uuid NOT NULL,
	"principal" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'KES' NOT NULL,
	"disbursed_date" date NOT NULL,
	"monthly_recovery" numeric(14, 2) NOT NULL,
	"term_months" integer NOT NULL,
	"interest_rate" numeric(6, 3) DEFAULT '0' NOT NULL,
	"recovered" numeric(14, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(14, 2) NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "management_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"year_month" varchar(7) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"narrative" text DEFAULT '' NOT NULL,
	"highlights" text DEFAULT '' NOT NULL,
	"risks" text DEFAULT '' NOT NULL,
	"prepared_by_id" uuid,
	"prepared_at" timestamp with time zone,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"basic_salary" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'KES' NOT NULL,
	"allowances" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overtime_hours" numeric(6, 2) DEFAULT '0' NOT NULL,
	"overtime_rate" numeric(10, 2) DEFAULT '0' NOT NULL,
	"bonus" numeric(14, 2) DEFAULT '0' NOT NULL,
	"other_deductions" numeric(14, 2) DEFAULT '0' NOT NULL,
	"loan_recovery" numeric(14, 2) DEFAULT '0' NOT NULL,
	"paye" numeric(14, 2) DEFAULT '0' NOT NULL,
	"nssf_employee" numeric(14, 2) DEFAULT '0' NOT NULL,
	"nssf_employer" numeric(14, 2) DEFAULT '0' NOT NULL,
	"sha_employee" numeric(14, 2) DEFAULT '0' NOT NULL,
	"nita_employer" numeric(14, 2) DEFAULT '0' NOT NULL,
	"ahl_employee" numeric(14, 2) DEFAULT '0' NOT NULL,
	"ahl_employer" numeric(14, 2) DEFAULT '0' NOT NULL,
	"gross_pay" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(14, 2) DEFAULT '0' NOT NULL,
	"net_pay" numeric(14, 2) DEFAULT '0' NOT NULL,
	"employer_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"year_month" varchar(7) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" varchar(12) DEFAULT 'draft' NOT NULL,
	"processed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" varchar(24) NOT NULL,
	"supplier_id" uuid NOT NULL,
	"supplier_ref" varchar(64),
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"currency" varchar(3) NOT NULL,
	"fx_rate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"subtotal" numeric(18, 4) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(6, 3) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"total" numeric(18, 4) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"balance" numeric(18, 4) DEFAULT '0' NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"journal_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" varchar(24) NOT NULL,
	"bill_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(18, 4) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"fx_rate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"payment_method" varchar(12) NOT NULL,
	"reference" varchar(64),
	"journal_entry_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"trip_id" uuid NOT NULL,
	"kind" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(64) NOT NULL,
	"status" varchar(12) DEFAULT 'pending' NOT NULL,
	"storage_key" text,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "trip_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"trip_id" uuid NOT NULL,
	"from_status" varchar(16),
	"to_status" varchar(16) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_name" text NOT NULL,
	"location" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" varchar(24) NOT NULL,
	"booking_id" uuid NOT NULL,
	"truck_id" uuid NOT NULL,
	"trailer_id" uuid,
	"driver_id" uuid NOT NULL,
	"status" varchar(16) DEFAULT 'planned' NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"product" varchar(8),
	"cargo_type" text NOT NULL,
	"cargo_quantity" numeric(14, 2) NOT NULL,
	"cargo_unit" varchar(12) DEFAULT 'litres' NOT NULL,
	"loaded_litres" numeric(14, 2),
	"loading_temp_c" numeric(5, 2),
	"density_15c" numeric(6, 4),
	"loaded_litres_20c" numeric(14, 2),
	"loading_seal_numbers" text,
	"discharged_litres" numeric(14, 2),
	"discharge_temp_c" numeric(5, 2),
	"discharged_litres_20c" numeric(14, 2),
	"discharge_seal_numbers" text,
	"ullage_pct" numeric(6, 3),
	"transit_bond_number" varchar(64),
	"revenue_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"revenue_currency" varchar(3) NOT NULL,
	"driver_advance_kes" numeric(18, 4),
	"driver_advance_used_kes" numeric(18, 4),
	"planned_departure_date" date,
	"planned_delivery_date" date,
	"actual_departure_at" timestamp with time zone,
	"actual_delivery_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"actual_km" numeric(10, 2),
	"actual_fuel_litres" numeric(14, 2),
	"ready_to_invoice" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appraisal_cycles" ADD CONSTRAINT "appraisal_cycles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_reviews" ADD CONSTRAINT "appraisal_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_reviews" ADD CONSTRAINT "appraisal_reviews_cycle_id_appraisal_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."appraisal_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_reviews" ADD CONSTRAINT "appraisal_reviews_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_transactions" ADD CONSTRAINT "bank_statement_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_bill_id_supplier_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."supplier_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "border_crossings" ADD CONSTRAINT "border_crossings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "border_crossings" ADD CONSTRAINT "border_crossings_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_records" ADD CONSTRAINT "compliance_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_records" ADD CONSTRAINT "compliance_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_invoice_id_customer_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."customer_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_customer_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."customer_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jd_assignments" ADD CONSTRAINT "jd_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jd_assignments" ADD CONSTRAINT "jd_assignments_job_description_id_job_descriptions_id_fk" FOREIGN KEY ("job_description_id") REFERENCES "public"."job_descriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_card_services" ADD CONSTRAINT "job_card_services_job_card_id_job_cards_id_fk" FOREIGN KEY ("job_card_id") REFERENCES "public"."job_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_card_spares" ADD CONSTRAINT "job_card_spares_job_card_id_job_cards_id_fk" FOREIGN KEY ("job_card_id") REFERENCES "public"."job_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_card_spares" ADD CONSTRAINT "job_card_spares_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_packs" ADD CONSTRAINT "management_packs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_inputs" ADD CONSTRAINT "payroll_inputs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_inputs" ADD CONSTRAINT "payroll_inputs_period_id_payroll_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_inputs" ADD CONSTRAINT "payroll_inputs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_bills" ADD CONSTRAINT "supplier_bills_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_bills" ADD CONSTRAINT "supplier_bills_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_bill_id_supplier_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."supplier_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_documents" ADD CONSTRAINT "trip_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_documents" ADD CONSTRAINT "trip_documents_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_status_events" ADD CONSTRAINT "trip_status_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_status_events" ADD CONSTRAINT "trip_status_events_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_trailer_id_trailers_id_fk" FOREIGN KEY ("trailer_id") REFERENCES "public"."trailers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appraisal_cycles_org_idx" ON "appraisal_cycles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "appraisal_reviews_cycle_employee_idx" ON "appraisal_reviews" USING btree ("cycle_id","employee_id");--> statement-breakpoint
CREATE INDEX "attendance_employee_date_idx" ON "attendance_records" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "bank_tx_account_date_idx" ON "bank_statement_transactions" USING btree ("organization_id","account_code","date");--> statement-breakpoint
CREATE INDEX "bill_lines_bill_idx" ON "bill_line_items" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "bookings_org_idx" ON "bookings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bookings_number_idx" ON "bookings" USING btree ("organization_id","number");--> statement-breakpoint
CREATE INDEX "bookings_customer_idx" ON "bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "border_crossings_trip_idx" ON "border_crossings" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "compliance_employee_idx" ON "compliance_records" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "compliance_expiry_idx" ON "compliance_records" USING btree ("organization_id","expiry_date");--> statement-breakpoint
CREATE INDEX "contracts_employee_idx" ON "contracts" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "invoices_org_idx" ON "customer_invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoices_customer_idx" ON "customer_invoices" USING btree ("customer_id","issue_date");--> statement-breakpoint
CREATE INDEX "invoices_number_idx" ON "customer_invoices" USING btree ("organization_id","number");--> statement-breakpoint
CREATE INDEX "customer_payments_invoice_idx" ON "customer_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "departments_org_idx" ON "departments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "employees_org_idx" ON "employees" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "employees_number_idx" ON "employees" USING btree ("organization_id","employee_number");--> statement-breakpoint
CREATE INDEX "employees_dept_idx" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "expenses_org_idx" ON "expenses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "expenses_status_idx" ON "expenses" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "expenses_trip_idx" ON "expenses" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "fuel_logs_org_idx" ON "fuel_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "fuel_logs_truck_idx" ON "fuel_logs" USING btree ("truck_id","datetime");--> statement-breakpoint
CREATE INDEX "invoice_lines_invoice_idx" ON "invoice_line_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "jc_services_card_idx" ON "job_card_services" USING btree ("job_card_id");--> statement-breakpoint
CREATE INDEX "jc_spares_card_idx" ON "job_card_spares" USING btree ("job_card_id");--> statement-breakpoint
CREATE INDEX "job_cards_org_idx" ON "job_cards" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "job_cards_truck_idx" ON "job_cards" USING btree ("truck_id");--> statement-breakpoint
CREATE INDEX "job_descriptions_org_idx" ON "job_descriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "journal_entries_org_idx" ON "journal_entries" USING btree ("organization_id","date");--> statement-breakpoint
CREATE INDEX "journal_entries_number_idx" ON "journal_entries" USING btree ("organization_id","number");--> statement-breakpoint
CREATE INDEX "journal_lines_entry_idx" ON "journal_lines" USING btree ("journal_entry_id");--> statement-breakpoint
CREATE INDEX "leave_employee_idx" ON "leave_requests" USING btree ("employee_id","start_date");--> statement-breakpoint
CREATE INDEX "loans_employee_idx" ON "loans" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "management_packs_org_period_idx" ON "management_packs" USING btree ("organization_id","year_month");--> statement-breakpoint
CREATE INDEX "payroll_inputs_period_employee_idx" ON "payroll_inputs" USING btree ("period_id","employee_id");--> statement-breakpoint
CREATE INDEX "payroll_periods_org_period_idx" ON "payroll_periods" USING btree ("organization_id","year_month");--> statement-breakpoint
CREATE INDEX "bills_org_idx" ON "supplier_bills" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bills_supplier_idx" ON "supplier_bills" USING btree ("supplier_id","issue_date");--> statement-breakpoint
CREATE INDEX "bills_number_idx" ON "supplier_bills" USING btree ("organization_id","number");--> statement-breakpoint
CREATE INDEX "supplier_payments_bill_idx" ON "supplier_payments" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "trip_docs_trip_idx" ON "trip_documents" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_events_trip_idx" ON "trip_status_events" USING btree ("trip_id","occurred_at");--> statement-breakpoint
CREATE INDEX "trips_org_idx" ON "trips" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "trips_number_idx" ON "trips" USING btree ("organization_id","number");--> statement-breakpoint
CREATE INDEX "trips_status_idx" ON "trips" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "trips_truck_idx" ON "trips" USING btree ("truck_id");--> statement-breakpoint
CREATE INDEX "trips_driver_idx" ON "trips" USING btree ("driver_id");