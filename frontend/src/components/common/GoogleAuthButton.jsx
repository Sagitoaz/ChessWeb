import { useCallback, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'

import { initializeGoogleIdentity, renderGoogleButton } from '@/utils/googleAuth'

const GoogleAuthButton = ({ onCredential, disabled = false, text = 'continue_with' }) => {
  const containerRef = useRef(null)
  const lastWidthRef = useRef(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const drawButton = useCallback(async () => {
    if (!containerRef.current) return

    const nextWidth = Math.max(220, Math.round(containerRef.current.getBoundingClientRect().width || 320))
    if (lastWidthRef.current === nextWidth) {
      return
    }

    lastWidthRef.current = nextWidth
    await renderGoogleButton(containerRef.current, { text })
  }, [text])

  const mountButton = useCallback(async () => {
    if (!containerRef.current) return

    setLoading(true)
    setError('')

    try {
      await initializeGoogleIdentity((response) => {
        if (!response?.credential) {
          setError('Google không trả về credential hợp lệ. Vui lòng thử lại.')
          return
        }

        void onCredential?.(response.credential)
      })

      await drawButton()
    } catch (err) {
      setError(err?.message || 'Không thể tải nút đăng nhập Google.')
    } finally {
      setLoading(false)
    }
  }, [drawButton, onCredential])

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      await mountButton()
    }

    void bootstrap()

    const handleResize = () => {
      if (!active || !containerRef.current) return
      void drawButton().catch(() => {})
    }

    window.addEventListener('resize', handleResize)

    return () => {
      active = false
      window.removeEventListener('resize', handleResize)
    }
  }, [drawButton, mountButton])

  return (
    <div className="space-y-2">
      <div className="relative min-h-[44px] rounded-lg">
        <div
          ref={containerRef}
          className={disabled ? 'pointer-events-none opacity-60' : ''}
          aria-disabled={disabled}
        />

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-500">
            Đang tải Google...
          </div>
        ) : null}

        {disabled ? (
          <div className="absolute inset-0 cursor-not-allowed rounded-lg bg-white/50" />
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-red-600">
          {error}
          {' '}
          Nếu bạn đang mở web bằng IP hoặc domain khác máy chính, hãy thêm đúng origin đó vào
          Google OAuth.
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          Nút này dùng popup đăng nhập chính thức của Google, ổn định hơn One Tap trên nhiều trình
          duyệt.
        </p>
      )}
    </div>
  )
}

GoogleAuthButton.propTypes = {
  disabled: PropTypes.bool,
  onCredential: PropTypes.func,
  text: PropTypes.oneOf(['continue_with', 'signin_with', 'signup_with']),
}

export default GoogleAuthButton
