import PropTypes from 'prop-types';

/**
 * Card Component - Flexible container với nhiều variants
 * 
 * @example
 * <Card>Simple card</Card>
 * <Card variant="elevated" padding="lg">
 *   <CardHeader>Title</CardHeader>
 *   <CardBody>Content</CardBody>
 * </Card>
 */
const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  className = '',
  onClick,
  ...props
}) => {
  // Base styles
  const baseStyles = 'rounded-lg transition-all duration-200';

  // Variant styles
  const variants = {
    default: 'bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700',
    elevated: 'bg-white shadow-md hover:shadow-lg dark:bg-gray-800',
    outlined: 'bg-transparent border-2 border-gray-300 dark:border-gray-600',
    flat: 'bg-gray-50 dark:bg-gray-900',
  };

  // Padding styles
  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  // Hover effect
  const hoverStyles = hoverable ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : '';

  // Interactive
  const interactiveStyles = onClick ? 'cursor-pointer' : '';

  const cardStyles = `${baseStyles} ${variants[variant]} ${paddings[padding]} ${hoverStyles} ${interactiveStyles} ${className}`;

  return (
    <div className={cardStyles} onClick={onClick} {...props}>
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'elevated', 'outlined', 'flat']),
  padding: PropTypes.oneOf(['none', 'sm', 'md', 'lg', 'xl']),
  hoverable: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func,
};

/**
 * CardHeader - Header section của Card
 */
export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`border-b border-gray-200 pb-3 mb-4 dark:border-gray-700 ${className}`} {...props}>
    {children}
  </div>
);

CardHeader.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * CardTitle - Title trong CardHeader
 */
export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`text-xl font-bold text-gray-900 dark:text-gray-100 ${className}`} {...props}>
    {children}
  </h3>
);

CardTitle.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * CardBody - Body section của Card
 */
export const CardBody = ({ children, className = '', ...props }) => (
  <div className={`text-gray-700 dark:text-gray-300 ${className}`} {...props}>
    {children}
  </div>
);

CardBody.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * CardFooter - Footer section của Card
 */
export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`border-t border-gray-200 pt-3 mt-4 dark:border-gray-700 ${className}`} {...props}>
    {children}
  </div>
);

CardFooter.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default Card;