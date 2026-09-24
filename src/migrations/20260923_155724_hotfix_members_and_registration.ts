import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Fail with a readable list instead of a bare "could not create unique index";
  // which duplicate to keep is an organizer's call, not a migration's.
  await db.execute(sql`
    DO $$
    DECLARE dupes text;
    BEGIN
      SELECT string_agg(format('event %s / user %s (%s rows)', event_id, user_id, n), '; ')
        INTO dupes
        FROM (SELECT event_id, user_id, count(*) AS n FROM registrations
              GROUP BY event_id, user_id HAVING count(*) > 1) d;
      IF dupes IS NOT NULL THEN
        RAISE EXCEPTION 'Resolve duplicate registrations before migrating: %', dupes;
      END IF;
    END $$;
  `)

  await db.execute(sql`
   CREATE TYPE "public"."enum_events_registration_selection_mode" AS ENUM('manual', 'accepted', 'confirmed');
  ALTER TABLE "users" ADD COLUMN "student_email_verified" boolean DEFAULT false;
  ALTER TABLE "events" ADD COLUMN "registration_selection_mode" "enum_events_registration_selection_mode" DEFAULT 'manual' NOT NULL;
  CREATE UNIQUE INDEX "event_user_idx" ON "registrations" USING btree ("event_id","user_id");
  ALTER TABLE "events" DROP COLUMN "auto_promote";`)

  // Capacity guard: Payload has no concept of it, so it lives in the DB where
  // concurrent auto-accepts serialize on the event row lock.
  await db.execute(sql`
    CREATE FUNCTION check_event_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      capacity numeric;
      occupied integer;
    BEGIN
      IF NEW.status NOT IN ('accepted', 'confirmed', 'participant') THEN RETURN NEW; END IF;
      IF TG_OP = 'UPDATE' THEN
        IF OLD.status IN ('accepted', 'confirmed', 'participant') AND OLD.event_id = NEW.event_id THEN
          RETURN NEW;
        END IF;
      END IF;

      SELECT participant_limit INTO capacity FROM events WHERE id = NEW.event_id FOR UPDATE;
      IF capacity IS NULL OR capacity <= 0 THEN RETURN NEW; END IF;

      SELECT count(*) INTO occupied FROM registrations
      WHERE event_id = NEW.event_id
        AND status IN ('accepted', 'confirmed', 'participant')
        AND (TG_OP = 'INSERT' OR id <> NEW.id);
      IF occupied >= capacity THEN
        RAISE EXCEPTION 'Event is full' USING ERRCODE = '23514';
      END IF;
      RETURN NEW;
    END $$;

    CREATE TRIGGER registrations_capacity_guard
      BEFORE INSERT OR UPDATE OF event_id, status ON registrations
      FOR EACH ROW EXECUTE FUNCTION check_event_capacity();
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TRIGGER IF EXISTS registrations_capacity_guard ON registrations;
  DROP FUNCTION IF EXISTS check_event_capacity();
  DROP INDEX "event_user_idx";
  ALTER TABLE "events" ADD COLUMN "auto_promote" boolean;
  ALTER TABLE "users" DROP COLUMN "student_email_verified";
  ALTER TABLE "events" DROP COLUMN "registration_selection_mode";
  DROP TYPE "public"."enum_events_registration_selection_mode";`)
}
