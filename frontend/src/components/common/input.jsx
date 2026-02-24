import PropTypes from 'prop-types'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useState, forwardRef } from 'react'

/**
 * Input Component
 *
 * @example
 * <Input type="text" label="Username" placeholder="Enter username" />
 * <Input type="email" label="Email" error="Invalid email" />
 * <Input type="password" label="Password" />
 */
const Input = forwardRef(
  (
    {
      label,
      type = 'text',
      error,
      helperText,
      placeholder,
      disabled = false,
      required = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className = '',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)

    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type

    // Base styles
    const baseStyles =
      'bg-white px-4 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed'

    // State styles
    const stateStyles = error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : isFocused
        ? 'border-blue-500 focus:border-blue-500 focus:ring-blue-500'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'

    // Text color
    const textColor = 'text-gray-900 placeholder:text-gray-400'

    // Width style
    const widthStyle = fullWidth ? 'w-full' : ''

    // Icon padding
    const iconPadding = leftIcon ? 'pl-10' : rightIcon || isPassword ? 'pr-10' : ''

    const inputStyles = `${baseStyles} ${stateStyles} ${textColor} ${widthStyle} ${iconPadding} ${className}`

    return (
      <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
        {/* Label */}
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{leftIcon}</div>
          )}

          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            placeholder={placeholder}
            disabled={disabled}
            className={inputStyles}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'input-error' : helperText ? 'input-helper' : undefined}
            {...props}
          />

          {/* Right Icon or Password Toggle */}
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          ) : rightIcon ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          ) : null}

          {/* Error Icon */}
          {error && !isPassword && !rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
              <AlertCircle size={18} />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p
            id="input-error"
            className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
          >
            <AlertCircle size={14} />
            {error}
          </p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <p id="input-helper" className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

Input.propTypes = {
  label: PropTypes.string,
  type: PropTypes.oneOf(['text', 'email', 'password', 'number', 'tel', 'url', 'search']),
  error: PropTypes.string,
  helperText: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  leftIcon: PropTypes.node,
  rightIcon: PropTypes.node,
  className: PropTypes.string,
}

export default Input
