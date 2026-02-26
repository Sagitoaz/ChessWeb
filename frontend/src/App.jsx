import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { NotificationProvider } from '@/components/common'
import { useAuthStore } from '@/store'
import AppRoutes from './routes'

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Seed mock user in dev mode so PrivateRoutes and pages get a valid user object
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.DEV
if (USE_MOCK && !localStorage.getItem('token')) {
  localStorage.setItem('token', 'mock-token-dev')
  localStorage.setItem(
    'user',
    JSON.stringify({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
      rating: 1500,
    })
  )
}

function App() {
  // Load persisted auth on startup (also picks up the mock user seeded above)
  useAuthStore.getState().loadUser()
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider position="top-right">
        <Router>
          <div className="min-h-screen bg-gray-50">
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </NotificationProvider>
    </QueryClientProvider>
  )
}

export default App