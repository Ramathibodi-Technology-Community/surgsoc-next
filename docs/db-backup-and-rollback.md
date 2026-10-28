# Database backup and rollback

Production is Neon Postgres, attached through the Vercel integration (the Vercel
project carries `NEON_PROJECT_ID`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`). One
`DATABASE_URL` is shared by production, preview and development, so a dev preview
writes to the same data as prod. Treat every Vercel deployment as prod data.

There are three layers, from fastest to slowest:

| Layer | Recovers from | Cost of use | Lives where |
| --- | --- | --- | --- |
| Neon branch as a named restore point | a migration you are about to run | seconds | inside Neon |
| Neon point-in-time restore (PITR) | bad migration, bad script, deleted rows | minutes | inside Neon, limited by your plan's history window |
| Daily encrypted `pg_dump` | Neon outage, history window already gone, account trouble | tens of minutes | GitHub Actions artifact, 30 days |

`payload migrate:down` is not a rollback. It reverses schema only. The
`drop_home_eyebrow_kicker` migration's `down()` re-adds `hero_eyebrow` and `kicker`
as empty columns, so the data is gone. The rollback for a bad migration is a restore.

## One-time setup (about 10 minutes)

1. **Find your history window.** Neon console > Project > Settings > Storage (or
   Backup & Restore). The window depends on the plan; the free plan's is short
   (hours), paid plans reach days to weeks. This was not discoverable from the repo
   or the Vercel API, so check it once and write the number here: `____`.
   If it is under 7 days, the daily dump below matters more.
2. **Make an age key pair** on your Mac: `brew install age && age-keygen -o surgsoc-backup.key`.
   Put the whole file in a password manager. Do not commit it. The line starting
   `# public key: age1...` is the public half.
3. **Add two GitHub Actions secrets** (repo Settings > Secrets and variables > Actions):
   - `BACKUP_AGE_RECIPIENT`: the `age1...` public key.
   - `BACKUP_DATABASE_URL`: the unpooled Neon connection string. Better: in the Neon
     console create a role with read-only access and use its unpooled string, so a
     leaked secret cannot write.
4. Run **Actions > DB backup > Run workflow** once, download the artifact, and do a
   restore drill (below). A backup nobody has restored is a hope, not a backup.

The workflow (`.github/workflows/db-backup.yml`) then runs daily at 02:20 ICT and
keeps each dump for 30 days. If it fails, GitHub emails you. The dump holds member
data (including `dob`), which is why it is encrypted before upload.

## Before running the pending prod migrations

Pending on prod as of 2026-10-28: `20260928_170806_event_workflows`,
`20261006_152216_event_group_answers_gallery`, `20261018_112346_drop_home_eyebrow_kicker`
(drops `home_content.hero_eyebrow` and `home_content_sections.kicker`, which the code
now on prod still reads, so the new code must be live on main first).

1. Merge dev into main and let Vercel finish deploying; confirm the site is up.
2. **Restore point in Neon:** console > Branches > Create branch from the production
   branch, current time, name it `pre-migrate-2026-MM-DD`. It is copy-on-write, so it
   costs next to nothing. Delete it a week after the migration is confirmed good.
3. **Off-Neon copy:** Actions > DB backup > Run workflow, label `pre-migrate`.
   Wait for green. (Or locally: `DATABASE_URL_UNPOOLED=... pnpm db:snapshot pre-migrate`.)
4. Run the migrations yourself (`pnpm db:migrate:prod`). Check the site and the
   admin panel. Note the clock time you started; you need it to roll back.

## Rolling back

Pick the smallest tool that fits. Decide quickly, but do not write to the database
between deciding and restoring, because anything written after the restore point is lost.

**A. You made a pre-migration branch (fastest).** Neon console > Branches > the
production branch > Restore > pick the `pre-migrate-...` branch. Neon swaps the data
in place and the connection string stays the same. Redeploy the previous Vercel
build (Deployments > the last good one > Promote) so the code matches the old schema.

**B. Point-in-time restore, no branch.** Same screen, but choose "restore to a past
time" and enter a timestamp just before the migration started (UTC; check the time
zone shown). Neon keeps a backup branch of the pre-restore state automatically, so a
wrong guess is undoable. Works only inside the history window from setup step 1.

**C. Inspect first without touching prod.** Create a branch from a past timestamp
(Branches > Create > "Past data"). It gets its own connection string, so you can
`psql` in, compare rows, and `pg_dump -t some_table` just the damaged table to copy
back into prod. Use this for "someone deleted 40 registrations", where a full
restore would also discard everything legitimate since.

**D. Restore from the encrypted dump** (Neon unavailable, or history window passed):

```bash
gh run download <run-id> -n db-backup-<run-id>        # or download from the Actions page
age -d -i surgsoc-backup.key -o restore.dump 2026....dump.age
# restore into a fresh Neon branch/project, not over prod, then point DATABASE_URL at it
pg_restore --no-owner --no-privileges --clean --if-exists \
  -d "$NEW_DATABASE_URL_UNPOOLED" restore.dump
```

If you restore into a different project, update `DATABASE_URL` (and the other
`POSTGRES_*`/`PG*` vars if you use them) in Vercel, then redeploy.

After any restore: Payload's `payload_migrations` table was restored with the data, so
`pnpm db:migrate:prod` will re-run exactly the migrations that were not applied at the
restore point. Fix the problem in dev first, then migrate again.

## Restore drill (do once, redo after big schema changes)

Locally against Docker Postgres (`pnpm db:up`):

```bash
age -d -i surgsoc-backup.key -o drill.dump <file>.dump.age
createdb -h localhost -U <user> drill
pg_restore --no-owner --no-privileges -d "postgres://<user>:<pw>@localhost:5432/drill" drill.dump
psql "postgres://...:5432/drill" -c 'select count(*) from users;'
```

Row counts should look right. Delete `drill.dump` afterwards; it is real member data.

## What this does not cover

- **Secrets** (`PAYLOAD_SECRET`, Google OAuth). Restoring the DB without the same
  `PAYLOAD_SECRET` still works for data, but existing sessions and API keys stop validating.
- A dump is a daily point in time, so the worst case from the dump alone is losing
  up to 24 hours. PITR is what covers the gap.
