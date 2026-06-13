CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_person" text NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" text,
	"kra_pin" varchar(32),
	"customer_type" varchar(24),
	"epra_licence_number" varchar(64),
	"billing_address" text,
	"billing_currency" varchar(3) DEFAULT 'KES' NOT NULL,
	"payment_terms_days" integer DEFAULT 30 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"phone" varchar(32) NOT NULL,
	"national_id" varchar(32) NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"licence_class" varchar(8) NOT NULL,
	"licence_number" varchar(32) NOT NULL,
	"licence_expiry" date,
	"medical_expiry" date,
	"passport_number" varchar(32),
	"passport_expiry" date,
	"comesa_driver_permit_expiry" date,
	"default_truck_id" uuid,
	"hire_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"customer_id" uuid,
	"cargo_class" varchar(16),
	"basis" varchar(16) DEFAULT 'per_m3' NOT NULL,
	"amount" numeric(18, 6) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcontractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_person" text NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" text,
	"kra_pin" varchar(32),
	"mpesa_number" varchar(32),
	"bank_name" text,
	"bank_account" varchar(64),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"phone" varchar(32) NOT NULL,
	"email" text,
	"kra_pin" varchar(32),
	"payment_terms" varchar(24) DEFAULT 'net_30' NOT NULL,
	"default_payment_method" varchar(12) DEFAULT 'bank' NOT NULL,
	"mpesa_number" varchar(32),
	"bank_name" text,
	"bank_account" varchar(64),
	"default_expense_category" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trailers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"registration" varchar(16) NOT NULL,
	"owner_type" varchar(16) DEFAULT 'company_owned' NOT NULL,
	"subcontractor_id" uuid,
	"type" varchar(24) DEFAULT 'tanker' NOT NULL,
	"capacity_tonnes" numeric(8, 2) DEFAULT '0' NOT NULL,
	"axles" integer DEFAULT 3 NOT NULL,
	"year" integer NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"attached_truck_id" uuid,
	"insurance_expiry" date,
	"ntsa_inspection_expiry" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trucks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"registration" varchar(16) NOT NULL,
	"owner_type" varchar(16) DEFAULT 'company_owned' NOT NULL,
	"subcontractor_id" uuid,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"fuel_type" varchar(8) DEFAULT 'diesel' NOT NULL,
	"capacity_tonnes" numeric(8, 2) DEFAULT '0' NOT NULL,
	"axles" integer DEFAULT 2 NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"current_driver_id" uuid,
	"notes" text,
	"tank_capacity_litres" integer,
	"compartment_count" integer,
	"compartment_capacities_litres" integer[],
	"last_calibration_date" date,
	"calibration_due_date" date,
	"permitted_products" varchar(8)[],
	"insurance_expiry" date,
	"ntsa_inspection_expiry" date,
	"comesa_permit_expiry" date,
	"transit_permit_expiry" date,
	"epra_transit_licence_expiry" date,
	"petroleum_liability_expiry" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rates" ADD CONSTRAINT "rates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rates" ADD CONSTRAINT "rates_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trailers" ADD CONSTRAINT "trailers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trailers" ADD CONSTRAINT "trailers_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_org_idx" ON "customers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "drivers_org_idx" ON "drivers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "rates_org_idx" ON "rates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "rates_route_idx" ON "rates" USING btree ("organization_id","origin","destination");--> statement-breakpoint
CREATE INDEX "subcontractors_org_idx" ON "subcontractors" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "suppliers_org_idx" ON "suppliers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "trailers_org_idx" ON "trailers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "trucks_org_idx" ON "trucks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "trucks_registration_idx" ON "trucks" USING btree ("organization_id","registration");