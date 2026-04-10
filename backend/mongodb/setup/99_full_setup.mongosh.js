// Full setup entrypoint for MongoDB cloud
// Run:
// mongosh "$env:MONGODB_URI" --file backend/mongodb/setup/99_full_setup.mongosh.js

load('backend/mongodb/setup/00_create_collections.mongosh.js')
load('backend/mongodb/setup/01_create_indexes.mongosh.js')
load('backend/mongodb/setup/02_seed_reference.mongosh.js')

const runBotReplayBackfill =
	(process?.env?.RUN_BOT_REPLAY_BACKFILL || '').toLowerCase() === 'true'

if (runBotReplayBackfill) {
	load('backend/mongodb/setup/03_backfill_bot_replay.mongosh.js')
	print('[ok] Bot replay backfill completed')
} else {
	print('[skip] Bot replay backfill disabled (set RUN_BOT_REPLAY_BACKFILL=true to enable)')
}

print('[ok] MongoDB full setup completed')
