import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Loader } from '@components/common'

// Lazy load pages
const GameComponentsDemo = lazy(() => import('@pages/demo/GameComponentsDemo'))

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <Loader size="lg" text="Loading..." />
  </div>
)

// Simple test component
const TestPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
    <div className="text-center text-white">
      <h1 className="text-4xl font-bold mb-4">✅ ChessWeb is Running!</h1>
      <p className="text-xl mb-4">All components are ready</p>
      <a href="/demo" className="text-blue-200 underline hover:text-blue-100">
        Go to Demo Page →
      </a>
    </div>
  </div>
)

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Test Route */}
        <Route path="/" element={<TestPage />} />
        
        {/* Demo Route */}
        <Route path="/demo" element={<GameComponentsDemo />} />

        {/* 404 */}
        <Route path="*" element={<div className="min-h-screen flex items-center justify-center text-2xl">404 - Page Not Found</div>} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
