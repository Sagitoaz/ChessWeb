import PropTypes from 'prop-types'
import { User } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * Avatar Component - User avatar với fallback
 *
 * @example
 * <Avatar src="/avatar.jpg" alt="John Doe" />
 * <Avatar name="John Doe" size="lg" />
 * <Avatar status="online" />
 */
const Avatar = ({
  src,
  alt = 'User avatar',
  name,
  size = 'md',
  status,
  shape = 'circle',
  fallbackColor = 'blue',
  className = '',
  onClick,
  ...props
}) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [resolvedSrc, setResolvedSrc] = useState(src || '')
  const [retriedWithProxy, setRetriedWithProxy] = useState(false)

  const buildProxyUrl = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return ''
    const trimmed = rawUrl.trim()
    if (!/^https?:\/\//i.test(trimmed)) return trimmed

    try {
      const parsed = new URL(trimmed)
      const hostAndPath = `${parsed.host}${parsed.pathname}${parsed.search}`
      return `https://images.weserv.nl/?url=${encodeURIComponent(hostAndPath)}`
    } catch {
      return trimmed
    }
  }

  useEffect(() => {
    setImageError(false)
    setImageLoading(Boolean(src))
    setResolvedSrc(src || '')
    setRetriedWithProxy(false)
  }, [src])

  // Size styles
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
  }

  // Shape styles
  const shapes = {
    circle: 'rounded-full',
    square: 'rounded-md',
    rounded: 'rounded-lg',
  }

  // Status indicator size
  const statusSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
    '2xl': 'w-4 h-4',
  }

  // Status colors
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  }

  // Fallback colors
  const fallbackColors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    indigo: 'bg-indigo-500',
    gray: 'bg-gray-500',
  }

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return ''
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  // Interactive
  const interactiveStyles = onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''

  const avatarStyles = `${sizes[size]} ${shapes[shape]} ${interactiveStyles} ${className} relative inline-flex items-center justify-center overflow-hidden`

  const showFallback = !resolvedSrc || imageError

  return (
    <div className={avatarStyles} onClick={onClick} {...props}>
      {/* Image */}
      {!showFallback && (
        <>
          {imageLoading && (
            <div className={`absolute inset-0 ${fallbackColors[fallbackColor]} animate-pulse`} />
          )}
          <img
            src={resolvedSrc}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => {
              if (!retriedWithProxy) {
                const proxyUrl = buildProxyUrl(src)
                if (proxyUrl && proxyUrl !== resolvedSrc) {
                  setRetriedWithProxy(true)
                  setImageError(false)
                  setImageLoading(true)
                  setResolvedSrc(proxyUrl)
                  return
                }
              }
              setImageError(true)
              setImageLoading(false)
            }}
            onLoad={() => setImageLoading(false)}
          />
        </>
      )}

      {/* Fallback */}
      {showFallback && (
        <div
          className={`w-full h-full flex items-center justify-center ${fallbackColors[fallbackColor]} text-white font-semibold`}
        >
          {name ? (
            getInitials(name)
          ) : (
            <User
              size={
                size === 'xs'
                  ? 12
                  : size === 'sm'
                    ? 14
                    : size === 'md'
                      ? 16
                      : size === 'lg'
                        ? 20
                        : 24
              }
            />
          )}
        </div>
      )}

      {/* Status indicator */}
      {status && (
        <span
          className={`absolute bottom-0 right-0 ${statusSizes[size]} ${statusColors[status]} ${shape === 'circle' ? 'rounded-full' : 'rounded-sm'} border-2 border-white dark:border-gray-800`}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  )
}

Avatar.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', '2xl']),
  status: PropTypes.oneOf(['online', 'offline', 'away', 'busy']),
  shape: PropTypes.oneOf(['circle', 'square', 'rounded']),
  fallbackColor: PropTypes.oneOf([
    'blue',
    'green',
    'red',
    'yellow',
    'purple',
    'pink',
    'indigo',
    'gray',
  ]),
  className: PropTypes.string,
  onClick: PropTypes.func,
}

/**
 * AvatarGroup - Nhóm avatars chồng lên nhau
 */
export const AvatarGroup = ({ children, max = 3, size = 'md', className = '' }) => {
  const childArray = Array.isArray(children) ? children : [children]
  const displayedChildren = childArray.slice(0, max)
  const remaining = childArray.length - max

  // Spacing based on size
  const spacings = {
    xs: '-space-x-2',
    sm: '-space-x-2',
    md: '-space-x-3',
    lg: '-space-x-4',
    xl: '-space-x-5',
    '2xl': '-space-x-6',
  }

  return (
    <div className={`flex items-center ${spacings[size]} ${className}`}>
      {displayedChildren.map((child, index) => (
        <div key={index} className="ring-2 ring-white dark:ring-gray-800">
          {child}
        </div>
      ))}
      {remaining > 0 && (
        <Avatar
          name={`+${remaining}`}
          size={size}
          fallbackColor="gray"
          className="ring-2 ring-white dark:ring-gray-800"
        />
      )}
    </div>
  )
}

AvatarGroup.propTypes = {
  children: PropTypes.node.isRequired,
  max: PropTypes.number,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', '2xl']),
  className: PropTypes.string,
}

export default Avatar
