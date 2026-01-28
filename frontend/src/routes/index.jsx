import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Loader } from '@components/common'
import MainLayout from '@components/layout/MainLayout'

// Lazy load pages
const HomePage = lazy(() => import('@pages/home/HomePage'))
const LoginPage = lazy(() => import('@pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@pages/auth/RegisterPage'))
const DashboardPage = lazy(() => import('@pages/home/DashboardPage'))

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader size="lg" text="Loading..." />
  </div>
)

// Protected Route
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

// Public Route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? <Navigate to="/dashboard" replace /> : children
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Private Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            </PrivateRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
