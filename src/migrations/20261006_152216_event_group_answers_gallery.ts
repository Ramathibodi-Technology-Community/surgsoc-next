import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "events_gallery_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  ALTER TABLE "events" ALTER COLUMN "event_type_id" DROP NOT NULL;
  ALTER TABLE "registrations" ADD COLUMN "session_submission_id" integer;
  ALTER TABLE "events_gallery_links" ADD CONSTRAINT "events_gallery_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "events_gallery_links_order_idx" ON "events_gallery_links" USING btree ("_order");
  CREATE INDEX "events_gallery_links_parent_id_idx" ON "events_gallery_links" USING btree ("_parent_id");
  ALTER TABLE "registrations" ADD CONSTRAINT "registrations_session_submission_id_form_submissions_id_fk" FOREIGN KEY ("session_submission_id") REFERENCES "public"."form_submissions"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "registrations_session_submission_idx" ON "registrations" USING btree ("session_submission_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events_gallery_links" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "events_gallery_links" CASCADE;
  ALTER TABLE "registrations" DROP CONSTRAINT "registrations_session_submission_id_form_submissions_id_fk";
  
  DROP INDEX "registrations_session_submission_idx";
  ALTER TABLE "events" ALTER COLUMN "event_type_id" SET NOT NULL;
  ALTER TABLE "registrations" DROP COLUMN "session_submission_id";`)
}
