// Full setup entrypoint for MongoDB cloud
// Run:
// mongosh "$env:MONGODB_URI" --file backend/mongodb/setup/99_full_setup.mongosh.js

load('backend/mongodb/setup/00_create_collections.mongosh.js')
load('backend/mongodb/setup/01_create_indexes.mongosh.js')
load('backend/mongodb/setup/02_seed_reference.mongosh.js')

print('[ok] MongoDB full setup completed')
