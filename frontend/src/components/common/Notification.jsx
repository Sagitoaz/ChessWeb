import { useState, useEffect, createContext, useContext } from 'react'
import PropTypes from 'prop-types'

/**
 * Notification Context để quản lý toast notifications globally
 */
const NotificationContext = createContext(null)

/**
 * Hook để sử dụng notifications
 * Usage: const { showNotification } = useNotification()
 */
export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}

/**
 * Single Toast Item Component
 */
const Toast = ({ id, type, title, message, duration, onClose }) => {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose(id)
    }, 300) // Match animation duration
  }

  // Icon và màu sắc theo type
  const typeConfig = {
    success: {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      bgColor: 'bg-green-50 dark:bg-green-900/90',
      borderColor: 'border-green-200 dark:border-green-700',
      iconColor: 'text-green-500 dark:text-green-400',
      titleColor: 'text-green-800 dark:text-green-200',
      messageColor: 'text-green-700 dark:text-green-300',
    },
    error: {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
      bgColor: 'bg-red-50 dark:bg-red-900/90',
      borderColor: 'border-red-200 dark:border-red-700',
      iconColor: 'text-red-500 dark:text-red-400',
      titleColor: 'text-red-800 dark:text-red-200',
      messageColor: 'text-red-700 dark:text-red-300',
    },
    warning: {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/90',
      borderColor: 'border-yellow-200 dark:border-yellow-700',
      iconColor: 'text-yellow-500 dark:text-yellow-400',
      titleColor: 'text-yellow-800 dark:text-yellow-200',
      messageColor: 'text-yellow-700 dark:text-yellow-300',
    },
    info: {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      bgColor: 'bg-blue-50 dark:bg-blue-900/90',
      borderColor: 'border-blue-200 dark:border-blue-700',
      iconColor: 'text-blue-500 dark:text-blue-400',
      titleColor: 'text-blue-800 dark:text-blue-200',
      messageColor: 'text-blue-700 dark:text-blue-300',
    },
  }

  const config = typeConfig[type] || typeConfig.info

  return (
    <div
      className={`
        flex items-start gap-3 p-4 mb-3 rounded-lg border shadow-lg
        ${config.bgColor} ${config.borderColor}
        ${isExiting ? 'animate-slideOutRight' : 'animate-slideInRight'}
        transition-all duration-300 backdrop-blur-sm
      `}
      role="alert"
    >
      <div className={`flex-shrink-0 ${config.iconColor}`}>
        {config.icon}
      </div>
      
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`font-semibold ${config.titleColor} mb-1`}>
            {title}
          </h4>
        )}
        {message && (
          <p className={`text-sm ${config.messageColor}`}>
            {message}
          </p>
        )}
      </div>

      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="Close notification"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}

Toast.propTypes = {
  id: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  duration: PropTypes.number,
  onClose: PropTypes.func.isRequired,
}

/**
 * Notification Provider Component
 * Wrap your app with this to enable notifications
 */
export const NotificationProvider = ({ children, position = 'top-right' }) => {
  const [notifications, setNotifications] = useState([])

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  }

  const showNotification = ({ 
    type = 'info', 
    title, 
    message, 
    duration = 5000 
  }) => {
    const id = Date.now().toString() + Math.random().toString(36)
    setNotifications((prev) => [...prev, { id, type, title, message, duration }])
  }

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id))
  }

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Toast Container */}
      <div 
        className={`fixed ${positionClasses[position]} z-50 w-full max-w-sm`}
        aria-live="polite"
        aria-atomic="true"
      >
        {notifications.map((notif) => (
          <Toast
            key={notif.id}
            {...notif}
            onClose={removeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
  position: PropTypes.oneOf([
    'top-right', 
    'top-left', 
    'top-center', 
    'bottom-right', 
    'bottom-left', 
    'bottom-center'
  ]),
}

export default NotificationProvider
