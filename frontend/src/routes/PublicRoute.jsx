import { Navigate } from 'react-router-dom'
import { Loader } from '@/components/common'
import { useAuthStore } from '@/store'

/**
 * PublicRoute - Routes công khai (login, register)
 * Redirect về /dashboard nếu đã đăng nhập
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, hasHydrated } = useAuthStore()

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader size="lg" text="Đang khởi tạo phiên đăng nhập..." />
      </div>
    )
  }

  if (isAuthenticated) {
    // Redirect to dashboard if already authenticated
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default PublicRoute
