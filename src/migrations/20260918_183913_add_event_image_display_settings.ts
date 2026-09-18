import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_event_card_image_display" AS ENUM('expand-card', 'shrink-img-to-fit');
  CREATE TYPE "public"."enum_site_settings_event_detail_image_display" AS ENUM('full-size', 'shrink-img-to-fit');
  ALTER TABLE "site_settings" ADD COLUMN "event_card_image_display" "enum_site_settings_event_card_image_display" DEFAULT 'shrink-img-to-fit';
  ALTER TABLE "site_settings" ADD COLUMN "event_detail_image_display" "enum_site_settings_event_detail_image_display" DEFAULT 'shrink-img-to-fit';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN "event_card_image_display";
  ALTER TABLE "site_settings" DROP COLUMN "event_detail_image_display";
  DROP TYPE "public"."enum_site_settings_event_card_image_display";
  DROP TYPE "public"."enum_site_settings_event_detail_image_display";`)
}
