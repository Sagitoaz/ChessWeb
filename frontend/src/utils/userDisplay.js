export const getUserDisplayName = (user, fallback = 'Người chơi') => {
  if (!user || typeof user !== 'object') return fallback

  const displayName =
    typeof user.displayName === 'string' && user.displayName.trim().length > 0
      ? user.displayName.trim()
      : typeof user.username === 'string' && user.username.trim().length > 0
        ? user.username.trim()
        : typeof user.name === 'string' && user.name.trim().length > 0
          ? user.name.trim()
          : ''

  return displayName || fallback
}

export const getUserInitial = (user, fallback = 'U') => {
  const name = getUserDisplayName(user, fallback)
  return name?.[0]?.toUpperCase?.() || fallback
}
