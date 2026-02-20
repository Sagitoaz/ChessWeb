import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
  className = '',
  ...props
}) => {
  // Base styles
  const baseStyles = 'font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2';

  // Variant styles
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500 dark:bg-gray-500 dark:hover:bg-gray-600',
    outline: 'border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 dark:bg-green-500 dark:hover:bg-green-600',
    ghost: 'hover:bg-gray-100 text-gray-700 focus:ring-gray-500 dark:hover:bg-gray-800 dark:text-gray-300',
  };

  // Size styles
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Width style
  const widthStyle = fullWidth ? 'w-full' : '';

  // Combine all styles
  const buttonStyles = `${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`;

  return (
    <button
      type={type}
      className={buttonStyles}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      )}
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'danger', 'success', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  onClick: PropTypes.func,
  className: PropTypes.string,
};

export default Button;