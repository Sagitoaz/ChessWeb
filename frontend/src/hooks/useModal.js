import { useState, useCallback, useEffect } from 'react'

/**
 * useModal Hook
 * Custom hook for managing modal state and behavior
 *
 * @param {boolean} initialState - Initial open/close state (default: false)
 * @param {function} onOpen - Callback when modal opens
 * @param {function} onClose - Callback when modal closes
 * @returns {object} Modal state and controls
 */
export const useModal = (initialState = false, onOpen = null, onClose = null) => {
  const [isOpen, setIsOpen] = useState(initialState)
  const [data, setData] = useState(null)

  const open = useCallback(
    (modalData = null) => {
      setIsOpen(true)
      if (modalData !== null) {
        setData(modalData)
      }
      onOpen?.(modalData)
    },
    [onOpen]
  )

  const close = useCallback(() => {
    setIsOpen(false)
    setData(null)
    onClose?.()
  }, [onClose])

  const toggle = useCallback(
    (modalData = null) => {
      if (isOpen) {
        close()
      } else {
        open(modalData)
      }
    },
    [isOpen, open, close]
  )

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        close()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, close])

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
  }
}

/**
 * useConfirmModal Hook
 * Custom hook for confirmation modals
 *
 * @returns {object} Confirm modal state and controls
 */
export const useConfirmModal = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState({
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    onCancel: null,
  })

  const confirm = useCallback((options) => {
    setConfig({
      title: options.title || 'Confirm',
      message: options.message || 'Are you sure?',
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      onConfirm: options.onConfirm || null,
      onCancel: options.onCancel || null,
      variant: options.variant || 'primary',
    })
    setIsOpen(true)
  }, [])

  const handleConfirm = useCallback(() => {
    config.onConfirm?.()
    setIsOpen(false)
  }, [config])

  const handleCancel = useCallback(() => {
    config.onCancel?.()
    setIsOpen(false)
  }, [config])

  return {
    isOpen,
    config,
    confirm,
    handleConfirm,
    handleCancel,
  }
}

export default useModal
