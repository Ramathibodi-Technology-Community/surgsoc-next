import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "forms"
      ADD COLUMN IF NOT EXISTS "publish_allow_multiple_submissions" boolean DEFAULT false;
    ALTER TABLE "form_submissions"
      ADD COLUMN IF NOT EXISTS "single_submission_key" varchar;
    CREATE UNIQUE INDEX IF NOT EXISTS "form_submissions_single_submission_key_idx"
      ON "form_submissions" USING btree ("single_submission_key");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "form_submissions_single_submission_key_idx";
    ALTER TABLE "form_submissions"
      DROP COLUMN IF EXISTS "single_submission_key";
    ALTER TABLE "forms"
      DROP COLUMN IF EXISTS "publish_allow_multiple_submissions";
  `)
}
