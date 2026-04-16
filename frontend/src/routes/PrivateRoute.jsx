import { Navigate } from 'react-router-dom'
import { Loader } from '@/components/common'
import { useAuthStore } from '@/store'

/**
 * PrivateRoute - Bảo vệ các routes cần authentication
 * Redirect về /login nếu chưa đăng nhập.
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, hasHydrated } = useAuthStore()

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader size="lg" text="Đang kiểm tra phiên đăng nhập..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default PrivateRoute
