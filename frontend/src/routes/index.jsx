import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Loader } from '@components/common'

// Lazy load pages
const GameComponentsDemo = lazy(() => import('@pages/demo/GameComponentsDemo'))

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader size="lg" text="Loading..." />
  </div>
)

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Demo Route */}
        <Route path="/" element={<GameComponentsDemo />} />
        <Route path="/demo" element={<GameComponentsDemo />} />

        {/* 404 */}
        <Route path="*" element={<div className="min-h-screen flex items-center justify-center text-2xl">404 - Page Not Found</div>} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
