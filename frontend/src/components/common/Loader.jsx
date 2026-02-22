import PropTypes from 'prop-types'

/**
 * Spinner Component
 * Simple loading spinner animation
 */
const Spinner = ({ size = 'md', text = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`${sizeClasses[size]} border-4 border-gray-600 dark:border-gray-600 border-t-[#81b64c] rounded-full animate-spin`}
      />
      {text && (
        <p className="text-gray-600 dark:text-gray-300 text-sm">{text}</p>
      )}
    </div>
  )
}

Spinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  text: PropTypes.string,
}

/**
 * Skeleton Component
 * Loading placeholder với shimmer effect
 */
const Skeleton = ({ 
  variant = 'text', 
  width = '100%', 
  height, 
  className = '',
  count = 1,
  circle = false 
}) => {
  const getVariantClasses = () => {
    if (circle) return 'rounded-full'
    
    switch (variant) {
      case 'text':
        return 'h-4 rounded'
      case 'title':
        return 'h-8 rounded'
      case 'avatar':
        return 'w-12 h-12 rounded-full'
      case 'thumbnail':
        return 'w-full h-48 rounded-lg'
      case 'rectangular':
        return 'rounded-lg'
      default:
        return 'rounded'
    }
  }

  const skeletonElement = (
    <div
      className={`
        bg-gray-300 dark:bg-gray-700
        animate-pulse
        ${getVariantClasses()}
        ${className}
      `}
      style={{
        width: circle ? height : width,
        height: height,
      }}
    />
  )

  if (count > 1) {
    return (
      <div className="space-y-3">
        {[...Array(count)].map((_, index) => (
          <div key={index}>{skeletonElement}</div>
        ))}
      </div>
    )
  }

  return skeletonElement
}

Skeleton.propTypes = {
  variant: PropTypes.oneOf(['text', 'title', 'avatar', 'thumbnail', 'rectangular']),
  width: PropTypes.string,
  height: PropTypes.string,
  className: PropTypes.string,
  count: PropTypes.number,
  circle: PropTypes.bool,
}

/**
 * Loader Component (Main Export)
 * Combines Spinner and Skeleton loaders
 */
const Loader = ({ 
  type = 'spinner', 
  ...props 
}) => {
  if (type === 'skeleton') {
    return <Skeleton {...props} />
  }
  return <Spinner {...props} />
}

Loader.propTypes = {
  type: PropTypes.oneOf(['spinner', 'skeleton']),
}

// Export both individual components and main Loader
export default Loader
export { Spinner, Skeleton }
