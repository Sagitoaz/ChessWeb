// Full v2 reset + setup entrypoint.
// Destructive by design. Requires ALLOW_DB_RESET=true.
//
// Run:
//   $env:ALLOW_DB_RESET="true"
//   $env:MONGODB_DB_NAME="chessweb_dev"
//   mongosh "$env:MONGODB_URI" --file backend/mongodb/setup/v2/99_full_reset_setup_v2.mongosh.js

load('backend/mongodb/setup/v2/00_reset_database_v2.mongosh.js')
load('backend/mongodb/setup/v2/01_create_collections_v2.mongosh.js')
load('backend/mongodb/setup/v2/02_create_indexes_v2.mongosh.js')
load('backend/mongodb/setup/v2/03_seed_reference_v2.mongosh.js')

print('[ok] MongoDB v2 full reset + setup completed')
