import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "home_content_sections" DROP COLUMN "kicker";
  ALTER TABLE "home_content" DROP COLUMN "hero_eyebrow";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "home_content_sections" ADD COLUMN "kicker" varchar;
  ALTER TABLE "home_content" ADD COLUMN "hero_eyebrow" varchar;`)
}
