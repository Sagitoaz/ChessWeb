import { useCallback } from 'react'
import toast from 'react-hot-toast'

/**
 * useNotification Hook
 * Custom hook for toast notifications using react-hot-toast
 *
 * @returns {object} Notification methods
 */
export const useNotification = () => {
  const success = useCallback((message, options = {}) => {
    return toast.success(message, {
      duration: 3000,
      position: 'top-right',
      ...options,
    })
  }, [])

  const error = useCallback((message, options = {}) => {
    return toast.error(message, {
      duration: 4000,
      position: 'top-right',
      ...options,
    })
  }, [])

  const info = useCallback((message, options = {}) => {
    return toast(message, {
      duration: 3000,
      position: 'top-right',
      icon: 'ℹ️',
      ...options,
    })
  }, [])

  const warning = useCallback((message, options = {}) => {
    return toast(message, {
      duration: 3500,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: '#f59e0b',
        color: '#fff',
      },
      ...options,
    })
  }, [])

  const loading = useCallback((message, options = {}) => {
    return toast.loading(message, {
      position: 'top-right',
      ...options,
    })
  }, [])

  const promise = useCallback((promise, messages, options = {}) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading || 'Loading...',
        success: messages.success || 'Success!',
        error: messages.error || 'Error occurred',
      },
      {
        position: 'top-right',
        ...options,
      }
    )
  }, [])

  const dismiss = useCallback((toastId) => {
    if (toastId) {
      toast.dismiss(toastId)
    } else {
      toast.dismiss()
    }
  }, [])

  const custom = useCallback((render, options = {}) => {
    return toast.custom(render, {
      duration: 3000,
      position: 'top-right',
      ...options,
    })
  }, [])

  return {
    success,
    error,
    info,
    warning,
    loading,
    promise,
    dismiss,
    custom,
  }
}

export default useNotification
