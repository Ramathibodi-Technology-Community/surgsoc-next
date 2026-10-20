import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TYPE "public"."enum_events_event_structure" AS ENUM('standalone', 'multi_day', 'day');
  ALTER TABLE "events" ADD COLUMN "event_structure" "enum_events_event_structure" DEFAULT 'standalone' NOT NULL;
  ALTER TABLE "events" ADD COLUMN "parent_event_id" integer;
  ALTER TABLE "forms" ADD COLUMN "owner_id" integer;
  ALTER TABLE "form_submissions" ADD COLUMN "application_event_id" integer;
  ALTER TABLE "form_submissions" ADD COLUMN "selected_days" jsonb;
  ALTER TABLE "events" ADD CONSTRAINT "events_parent_event_id_events_id_fk" FOREIGN KEY ("parent_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "forms" ADD CONSTRAINT "forms_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_application_event_id_events_id_fk" FOREIGN KEY ("application_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "events_parent_event_idx" ON "events" USING btree ("parent_event_id");
  CREATE INDEX "forms_owner_idx" ON "forms" USING btree ("owner_id");
  CREATE INDEX "form_submissions_application_event_idx" ON "form_submissions" USING btree ("application_event_id");
  CREATE UNIQUE INDEX form_submissions_application_member_idx ON form_submissions (application_event_id, user_id) WHERE application_event_id IS NOT NULL;
  CREATE UNIQUE INDEX events_distinct_reflection_form_idx ON events (reflection_form_id) WHERE reflection_form_id IS NOT NULL;
  ALTER TABLE events ADD CONSTRAINT events_structure_parent_check CHECK ((event_structure = 'day') = (parent_event_id IS NOT NULL));
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX form_submissions_application_member_idx;
  DROP INDEX events_distinct_reflection_form_idx;
  ALTER TABLE events DROP CONSTRAINT events_structure_parent_check;
  ALTER TABLE "events" DROP CONSTRAINT "events_parent_event_id_events_id_fk";
  ALTER TABLE "forms" DROP CONSTRAINT "forms_owner_id_users_id_fk";
  ALTER TABLE "form_submissions" DROP CONSTRAINT "form_submissions_application_event_id_events_id_fk";
  DROP INDEX "events_parent_event_idx";
  DROP INDEX "forms_owner_idx";
  DROP INDEX "form_submissions_application_event_idx";
  ALTER TABLE "events" DROP COLUMN "event_structure";
  ALTER TABLE "events" DROP COLUMN "parent_event_id";
  ALTER TABLE "forms" DROP COLUMN "owner_id";
  ALTER TABLE "form_submissions" DROP COLUMN "application_event_id";
  ALTER TABLE "form_submissions" DROP COLUMN "selected_days";
  DROP TYPE "public"."enum_events_event_structure";
  `)
}
