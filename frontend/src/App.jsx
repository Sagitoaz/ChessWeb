import { HashRouter as Router } from 'react-router-dom'
import { useEffect } from 'react'
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

const preloadCoreRouteChunks = () => {
  // Preload high-traffic routes to avoid first-navigation full-page fallback flash.
  void import('@pages/ranked/RankedLobbyPage')
  void import('@pages/ranked/RankedGamePage')
  void import('@pages/rooms/RoomListPage')
  void import('@pages/rooms/CreateRoomPage')
  void import('@pages/rooms/JoinRoomPage')
  void import('@pages/tournaments/TournamentListPage')
  void import('@pages/bot/BotSelectPage')
}

function App() {
  useEffect(() => {
    useAuthStore.getState().loadUser()

    const handleStorageChange = (event) => {
      if (event.key === 'token' || event.key === 'user' || event.key === 'refreshToken') {
        useAuthStore.getState().loadUser()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  useEffect(() => {
    preloadCoreRouteChunks()
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
