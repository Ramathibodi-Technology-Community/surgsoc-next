import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

// team_members.academic_year was free text ("2025-2026" typed per row). Moves
// it onto the same shared `academic_terms` row that FormAssignments/Forms
// reference, so a term is one record everywhere.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "academic_year_id" integer;

    INSERT INTO "academic_terms" ("label", "slug", "updated_at", "created_at")
    SELECT distinct_years.academic_year, distinct_years.academic_year, now(), now()
    FROM (SELECT DISTINCT "academic_year" FROM "team_members") AS distinct_years
    WHERE NOT EXISTS (
      SELECT 1 FROM "academic_terms" WHERE "academic_terms"."slug" = distinct_years.academic_year
    );

    UPDATE "team_members" SET "academic_year_id" = "academic_terms"."id"
    FROM "academic_terms" WHERE "academic_terms"."slug" = "team_members"."academic_year";

    ALTER TABLE "team_members" ALTER COLUMN "academic_year_id" SET NOT NULL;
    ALTER TABLE "team_members" ADD CONSTRAINT "team_members_academic_year_id_academic_terms_id_fk"
      FOREIGN KEY ("academic_year_id") REFERENCES "academic_terms"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX IF NOT EXISTS "team_members_academic_year_idx" ON "team_members" USING btree ("academic_year_id");
    ALTER TABLE "team_members" DROP COLUMN IF EXISTS "academic_year";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "academic_year" varchar;

    UPDATE "team_members" SET "academic_year" = "academic_terms"."slug"
    FROM "academic_terms" WHERE "academic_terms"."id" = "team_members"."academic_year_id";

    ALTER TABLE "team_members" ALTER COLUMN "academic_year" SET NOT NULL;
    DROP INDEX IF EXISTS "team_members_academic_year_idx";
    ALTER TABLE "team_members" DROP CONSTRAINT IF EXISTS "team_members_academic_year_id_academic_terms_id_fk";
    ALTER TABLE "team_members" DROP COLUMN IF EXISTS "academic_year_id";
  `)
}
