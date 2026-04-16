// Backfill legacy bot games so replay can list/open them.
// Safe behavior:
// - Only updates games with mode 'bot' or 'HumanVsBot'
// - Only updates docs that already have a final result (win/lose/draw)
// - Does NOT fabricate result for unfinished/unknown games

(function backfillBotReplay() {
  const modes = ["bot", "HumanVsBot"];
  const resultSet = ["win", "lose", "draw"];

  const query = {
    mode: { $in: modes },
    result: { $in: resultSet },
    $or: [
      { state: { $exists: false } },
      { state: { $ne: "Saved" } },
      { moves: { $exists: false } },
      { metadata: { $exists: false } },
    ],
  };

  const now = new Date();
  const update = {
    $set: {
      mode: "bot",
      state: "Saved",
      moves: [],
      metadata: { totalMoves: 0, backfilled: true },
      updatedAt: now,
    },
  };

  const result = db.games.updateMany(query, update);

  print("[backfill-bot-replay] matched:", result.matchedCount);
  print("[backfill-bot-replay] modified:", result.modifiedCount);
})();
