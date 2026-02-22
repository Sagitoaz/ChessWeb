import PropTypes from 'prop-types'

/**
 * Loader Component
 * Simple loading spinner
 */
const Loader = ({ size = 'md', text = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`${sizeClasses[size]} border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin`}
      />
      {text && (
        <p className="text-gray-600 dark:text-gray-400 text-sm">{text}</p>
      )}
    </div>
  )
}

Loader.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  text: PropTypes.string,
}

export default Loader
