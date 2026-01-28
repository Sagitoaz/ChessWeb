import { create } from 'zustand'

/**
 * Auth Store - Quản lý state authentication
 */
export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  
  setUser: (user) => set({ user, isAuthenticated: true }),
  setToken: (token) => set({ token }),
  
  login: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },
  
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null, isAuthenticated: false })
  },
  
  // Load user từ localStorage khi app khởi động
  loadUser: () => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    
    if (token && userStr) {
      const user = JSON.parse(userStr)
      set({ user, token, isAuthenticated: true })
    }
  },
}))

/**
 * Game Store - Quản lý state game
 */
export const useGameStore = create((set) => ({
  currentGame: null,
  isPlaying: false,
  
  setCurrentGame: (game) => set({ currentGame: game, isPlaying: true }),
  endGame: () => set({ currentGame: null, isPlaying: false }),
}))

/**
 * UI Store - Quản lý state UI
 */
export const useUIStore = create((set) => ({
  sidebarOpen: false,
  theme: 'light',
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}))
