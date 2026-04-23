import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../../components/common/Notification'
import { useAuth } from '@/hooks/useAuth'

/**
 * LogoutPage - Trang logout và clear cache
 * Tự động xóa localStorage và redirect về login
 */
const LogoutPage = () => {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const { logout } = useAuth()

  useEffect(() => {
    let cancelled = false

    const runLogout = async () => {
      await logout()
      if (cancelled) return

      showNotification({
        type: 'success',
        title: 'Đã đăng xuất',
        message: 'Bạn đã đăng xuất thành công',
        duration: 2000,
      })

      setTimeout(() => {
        if (!cancelled) {
          navigate('/login', { replace: true })
        }
      }, 300)
    }

    void runLogout()

    return () => {
      cancelled = true
    }
  }, [logout, navigate, showNotification])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 via-rose-600 to-pink-600">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white mx-auto mb-4"></div>
        <p className="text-xl font-semibold">Đang đăng xuất...</p>
      </div>
    </div>
  )
}

export default LogoutPage
