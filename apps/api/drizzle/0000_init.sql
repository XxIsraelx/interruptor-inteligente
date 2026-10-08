CREATE TYPE "public"."event_type" AS ENUM('RELAY_ON', 'RELAY_OFF', 'COMMAND', 'ONLINE', 'OFFLINE', 'SCHEDULE', 'RULE', 'ENERGY_RESET');--> statement-breakpoint
CREATE TYPE "public"."relay_action" AS ENUM('ON', 'OFF');--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"icon" text DEFAULT 'plug' NOT NULL,
	"online" boolean DEFAULT false NOT NULL,
	"relay_on" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone,
	"voltage" double precision,
	"current" double precision,
	"power" double precision,
	"energy" double precision,
	"frequency" double precision,
	"power_factor" double precision,
	"rssi" integer,
	"firmware" text,
	"max_power_w" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"type" "event_type" NOT NULL,
	"source" text NOT NULL,
	"message" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"voltage" double precision,
	"current" double precision,
	"power" double precision,
	"energy" double precision,
	"frequency" double precision,
	"power_factor" double precision,
	"relay_on" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"action" "relay_action" NOT NULL,
	"time" text NOT NULL,
	"days_of_week" integer[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readings" ADD CONSTRAINT "readings_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_device_ts_idx" ON "events" USING btree ("device_id","ts");--> statement-breakpoint
CREATE INDEX "readings_device_ts_idx" ON "readings" USING btree ("device_id","ts");--> statement-breakpoint
CREATE INDEX "schedules_device_idx" ON "schedules" USING btree ("device_id");