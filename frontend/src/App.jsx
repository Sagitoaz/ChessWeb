import { HashRouter as Router } from 'react-router-dom'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { NotificationProvider } from '@/components/common'
import { useAuthStore } from '@/store'
import authService from '@/services/authService'
import socketService from '@/services/socketService'
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

function App() {
  useEffect(() => {
    let active = true
    const bootstrapAuth = async () => {
      const store = useAuthStore.getState()
      store.beginHydration()

      const rememberMe = localStorage.getItem('rememberMe')
      const hasSession = sessionStorage.getItem('authSession') === '1'
      if (!rememberMe && !hasSession) {
        if (active) {
          store.logout()
        }
        return
      }

      try {
        const data = await authService.restoreSession()
        if (!active) return
        const user = data?.user
        const token = data?.token
        if (!user || !token) {
          throw new Error('Không khôi phục được phiên đăng nhập.')
        }
        const remember = rememberMe !== 'false'
        store.login(user, token, { remember })
        socketService.connect(token)
      } catch {
        if (!active) return
        socketService.disconnect()
        store.logout()
      }
    }

    void bootstrapAuth()

    const handleStorageChange = (event) => {
      if (
        event.key === null ||
        event.key === 'rememberMe' ||
        event.key === 'authSession'
      ) {
        void bootstrapAuth()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      active = false
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

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
