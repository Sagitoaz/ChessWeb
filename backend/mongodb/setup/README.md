# MongoDB Setup

Use only the scripts in `v2/`.

Legacy MongoDB setup, audit, and backfill scripts were removed because they recreated the v1 database shape.

Current source of truth:

- `v2/run-atlas-reset-v2.ps1`
- `v2/99_full_reset_setup_v2.mongosh.js`
- `docs/be/mongodb-v2-redesign-backend-guide.md`

Do not recreate deleted legacy scripts unless the database design is intentionally changed and the backend guide is updated in the same change.
