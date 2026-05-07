export const DEFAULT_INITIAL_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const normalizeId = (value) => String(value || '').trim()

export const getGamePlayerEntry = (game, color) => {
  const targetColor = String(color || '').toLowerCase()
  const players = Array.isArray(game?.players) ? game.players : []
  return (
    players.find((player) => String(player?.color || '').toLowerCase() === targetColor) || null
  )
}

export const getGamePlayerId = (game, color) => {
  const targetColor = String(color || '').toLowerCase()
  const player = getGamePlayerEntry(game, targetColor)
  const v2Id = normalizeId(player?.userId || player?.id)
  if (v2Id) return v2Id

  const legacyKey = targetColor === 'white' ? 'whitePlayerId' : 'blackPlayerId'
  return normalizeId(game?.[legacyKey])
}

export const getGamePlayerObject = (game, color) => {
  const targetColor = String(color || '').toLowerCase()
  const player = getGamePlayerEntry(game, targetColor)
  if (player?.profile && typeof player.profile === 'object') return player.profile
  if (player && (player.username || player.displayName || player.name)) return player
  return targetColor === 'white' ? game?.whitePlayer : game?.blackPlayer
}

export const getInitialFen = (game) =>
  game?.initialFen || game?.initialFEN || game?.fen || DEFAULT_INITIAL_FEN

export const getGameMoves = (game) =>
  Array.isArray(game?.moves)
    ? game.moves
    : Array.isArray(game?.gameMoves)
      ? game.gameMoves
      : Array.isArray(game?.moveHistory)
        ? game.moveHistory
        : []

export const getGameTotalMoves = (game) =>
  Number(game?.totalMoves ?? game?.metadata?.totalMoves ?? getGameMoves(game).length ?? 0)

export const getViewerColor = (game, userId) => {
  const normalizedUserId = normalizeId(userId)
  if (!normalizedUserId) return null
  if (getGamePlayerId(game, 'white') === normalizedUserId) return 'white'
  if (getGamePlayerId(game, 'black') === normalizedUserId) return 'black'
  return null
}
