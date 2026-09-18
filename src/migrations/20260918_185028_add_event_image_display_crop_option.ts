import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_site_settings_event_card_image_display" ADD VALUE 'crop-to-fit';
  ALTER TYPE "public"."enum_site_settings_event_detail_image_display" ADD VALUE 'crop-to-fit';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ALTER COLUMN "event_card_image_display" SET DATA TYPE text;
  ALTER TABLE "site_settings" ALTER COLUMN "event_card_image_display" SET DEFAULT 'shrink-img-to-fit'::text;
  DROP TYPE "public"."enum_site_settings_event_card_image_display";
  CREATE TYPE "public"."enum_site_settings_event_card_image_display" AS ENUM('expand-card', 'shrink-img-to-fit');
  ALTER TABLE "site_settings" ALTER COLUMN "event_card_image_display" SET DEFAULT 'shrink-img-to-fit'::"public"."enum_site_settings_event_card_image_display";
  ALTER TABLE "site_settings" ALTER COLUMN "event_card_image_display" SET DATA TYPE "public"."enum_site_settings_event_card_image_display" USING "event_card_image_display"::"public"."enum_site_settings_event_card_image_display";
  ALTER TABLE "site_settings" ALTER COLUMN "event_detail_image_display" SET DATA TYPE text;
  ALTER TABLE "site_settings" ALTER COLUMN "event_detail_image_display" SET DEFAULT 'shrink-img-to-fit'::text;
  DROP TYPE "public"."enum_site_settings_event_detail_image_display";
  CREATE TYPE "public"."enum_site_settings_event_detail_image_display" AS ENUM('full-size', 'shrink-img-to-fit');
  ALTER TABLE "site_settings" ALTER COLUMN "event_detail_image_display" SET DEFAULT 'shrink-img-to-fit'::"public"."enum_site_settings_event_detail_image_display";
  ALTER TABLE "site_settings" ALTER COLUMN "event_detail_image_display" SET DATA TYPE "public"."enum_site_settings_event_detail_image_display" USING "event_detail_image_display"::"public"."enum_site_settings_event_detail_image_display";`)
}
