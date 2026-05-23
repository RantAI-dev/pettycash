CREATE TABLE "app_settings" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"categories" jsonb NOT NULL,
	"projects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notif_settings" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"file_name" text NOT NULL,
	"img_data" text,
	"mime_type" text,
	"file_size" integer,
	"uploaded_by" text NOT NULL,
	"uploaded_at" bigint NOT NULL,
	"kind" text DEFAULT 'bukti' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycles" (
	"id" text PRIMARY KEY NOT NULL,
	"fund_id" text NOT NULL,
	"period_start" bigint NOT NULL,
	"period_end" bigint NOT NULL,
	"total_spent" bigint NOT NULL,
	"requested_amount" bigint NOT NULL,
	"approved_amount" bigint,
	"status" text NOT NULL,
	"requested_by" text NOT NULL,
	"approved_by" text,
	"requested_at" bigint NOT NULL,
	"approved_at" bigint
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funds" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ceiling" bigint NOT NULL,
	"current_balance" bigint NOT NULL,
	"custodian_id" text NOT NULL,
	"pre_approval_threshold" bigint NOT NULL,
	"bukti_sla_hours" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"text" text NOT NULL,
	"time" bigint NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"tx_id" text
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"fund_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"custodian_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"category" text NOT NULL,
	"project" text DEFAULT '(Tanpa Proyek)' NOT NULL,
	"description" text NOT NULL,
	"status" text NOT NULL,
	"spent_date" text NOT NULL,
	"verbal_approval" text,
	"created_at" bigint NOT NULL,
	"verified_at" bigint,
	"closed_at" bigint
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"divisi" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login" bigint,
	"password_hash" text
);
