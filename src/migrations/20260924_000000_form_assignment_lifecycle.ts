import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM "form_assignments" GROUP BY "form_id", "user_id" HAVING count(*) > 1
      ) THEN
        RAISE EXCEPTION 'Cannot add form assignment uniqueness: reconcile duplicate form_id/user_id rows first.';
      END IF;
    END $$;
    CREATE TABLE IF NOT EXISTS "academic_terms" (
      "id" serial PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "academic_terms_slug_idx" ON "academic_terms" USING btree ("slug");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "academic_terms_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_academic_terms_fk"
      FOREIGN KEY ("academic_terms_id") REFERENCES "academic_terms"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_academic_terms_id_idx"
      ON "payload_locked_documents_rels" USING btree ("academic_terms_id");

    ALTER TABLE "forms"
      ADD COLUMN IF NOT EXISTS "annual_survey_enabled" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "survey_academic_year_id" integer,
      ADD COLUMN IF NOT EXISTS "survey_activation_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "survey_deadline" timestamp(3) with time zone;
    ALTER TABLE "events"
      ADD COLUMN IF NOT EXISTS "reflection_release_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "reflection_deadline" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "reflection_released_early_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "reflection_released_early_by_id" integer;
    ALTER TABLE "form_assignments"
      ADD COLUMN IF NOT EXISTS "kind" varchar,
      ADD COLUMN IF NOT EXISTS "source" varchar,
      ADD COLUMN IF NOT EXISTS "active_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "source_event_id" integer,
      ADD COLUMN IF NOT EXISTS "survey_academic_year_id" integer;

    ALTER TABLE "forms" ADD CONSTRAINT "forms_survey_academic_year_id_academic_terms_id_fk"
      FOREIGN KEY ("survey_academic_year_id") REFERENCES "academic_terms"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "events" ADD CONSTRAINT "events_reflection_released_early_by_id_users_id_fk"
      FOREIGN KEY ("reflection_released_early_by_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_source_event_id_events_id_fk"
      FOREIGN KEY ("source_event_id") REFERENCES "events"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_survey_academic_year_id_academic_terms_id_fk"
      FOREIGN KEY ("survey_academic_year_id") REFERENCES "academic_terms"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX IF NOT EXISTS "forms_survey_academic_year_idx" ON "forms" USING btree ("survey_academic_year_id");
    CREATE INDEX IF NOT EXISTS "form_assignments_source_event_idx" ON "form_assignments" USING btree ("source_event_id");
    CREATE INDEX IF NOT EXISTS "form_assignments_survey_academic_year_idx" ON "form_assignments" USING btree ("survey_academic_year_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "form_assignments_form_user_unique_idx" ON "form_assignments" USING btree ("form_id", "user_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "form_assignments_form_user_unique_idx";
    DROP INDEX IF EXISTS "form_assignments_survey_academic_year_idx";
    DROP INDEX IF EXISTS "form_assignments_source_event_idx";
    DROP INDEX IF EXISTS "forms_survey_academic_year_idx";
    ALTER TABLE "form_assignments" DROP CONSTRAINT IF EXISTS "form_assignments_survey_academic_year_id_academic_terms_id_fk";
    ALTER TABLE "form_assignments" DROP CONSTRAINT IF EXISTS "form_assignments_source_event_id_events_id_fk";
    ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_reflection_released_early_by_id_users_id_fk";
    ALTER TABLE "forms" DROP CONSTRAINT IF EXISTS "forms_survey_academic_year_id_academic_terms_id_fk";
    ALTER TABLE "form_assignments"
      DROP COLUMN IF EXISTS "survey_academic_year_id",
      DROP COLUMN IF EXISTS "source_event_id",
      DROP COLUMN IF EXISTS "cancelled_at",
      DROP COLUMN IF EXISTS "active_at",
      DROP COLUMN IF EXISTS "source",
      DROP COLUMN IF EXISTS "kind";
    ALTER TABLE "events"
      DROP COLUMN IF EXISTS "reflection_released_early_by_id",
      DROP COLUMN IF EXISTS "reflection_released_early_at",
      DROP COLUMN IF EXISTS "reflection_deadline",
      DROP COLUMN IF EXISTS "reflection_release_at";
    ALTER TABLE "forms"
      DROP COLUMN IF EXISTS "survey_deadline",
      DROP COLUMN IF EXISTS "survey_activation_at",
      DROP COLUMN IF EXISTS "survey_academic_year_id",
      DROP COLUMN IF EXISTS "annual_survey_enabled";

    DROP INDEX IF EXISTS "payload_locked_documents_rels_academic_terms_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_academic_terms_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "academic_terms_id";

    DROP INDEX IF EXISTS "academic_terms_slug_idx";
    DROP TABLE IF EXISTS "academic_terms";
  `)
}
