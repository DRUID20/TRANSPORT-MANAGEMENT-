CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" varchar(24) NOT NULL,
	"name" text NOT NULL,
	"category" varchar(32) NOT NULL,
	"description" text,
	"serial_number" varchar(120),
	"location" text,
	"supplier_id" uuid,
	"acquisition_date" date NOT NULL,
	"cost" numeric(16, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'KES' NOT NULL,
	"depreciation_method" varchar(20) DEFAULT 'straight_line' NOT NULL,
	"useful_life_months" integer,
	"depreciation_rate_pct" numeric(6, 3),
	"residual_value" numeric(16, 2) DEFAULT '0' NOT NULL,
	"accumulated_depreciation" numeric(16, 2) DEFAULT '0' NOT NULL,
	"depreciation_start_date" date NOT NULL,
	"last_depreciated_on" date,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"disposal_date" date,
	"disposal_proceeds" numeric(16, 2),
	"disposal_journal_entry_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_org_idx" ON "assets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "assets_category_idx" ON "assets" USING btree ("organization_id","category");
