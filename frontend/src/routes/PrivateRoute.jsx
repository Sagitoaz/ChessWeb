import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store'

/**
 * PrivateRoute - Bảo vệ các routes cần authentication
 * Redirect về /login nếu chưa đăng nhập
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" replace />
  }
  
  return children
}

export default PrivateRoute
