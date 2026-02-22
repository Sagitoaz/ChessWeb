import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store'

/**
 * PublicRoute - Routes công khai (login, register)
 * Redirect về /dashboard nếu đã đăng nhập
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  
  if (isAuthenticated) {
    // Redirect to dashboard if already authenticated
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

export default PublicRoute
