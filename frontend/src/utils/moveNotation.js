const cleanText = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const normalizeSquare = (value) => {
  const square = cleanText(value).toLowerCase()
  return /^[a-h][1-8]$/.test(square) ? square : ''
}

export const getMoveLabel = (move) => {
  if (!move || typeof move !== 'object') return ''

  const san = cleanText(move.san)
  if (san) return san

  const notation = cleanText(move.notation)
  if (notation) return notation

  const lan = cleanText(move.lan)
  if (lan) return lan

  const uci = cleanText(move.uci)
  if (uci) return uci

  const from = normalizeSquare(move.from)
  const to = normalizeSquare(move.to)
  const promotion = cleanText(move.promotion).toLowerCase()
  if (from && to) {
    const suffix = promotion && /^[qrbn]$/.test(promotion) ? promotion : ''
    return `${from}${to}${suffix}`
  }

  return ''
}

export const buildMovePairs = (moves = []) => {
  const safeMoves = Array.isArray(moves) ? moves : []
  const pairs = []

  for (let index = 0; index < safeMoves.length; index += 2) {
    pairs.push({
      fullMove: Math.floor(index / 2) + 1,
      white: safeMoves[index] || null,
      black: safeMoves[index + 1] || null,
      whiteIndex: index,
      blackIndex: index + 1,
    })
  }

  return pairs
}
