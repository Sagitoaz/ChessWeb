import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store'

// Bypass auth check when running in mock/dev mode (auth pages not implemented yet)
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.DEV

/**
 * PrivateRoute - Bảo vệ các routes cần authentication
 * Redirect về /login nếu chưa đăng nhập.
 * Trong mock/dev mode: luôn cho phép truy cập (auth chưa implement).
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()

  if (!USE_MOCK && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default PrivateRoute
