import { create } from 'zustand'

const REMEMBER_ME_KEY = 'rememberMe'
const SESSION_AUTH_KEY = 'authSession'

/**
 * Auth Store - Quản lý state authentication
 */
export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  hasHydrated: false,

  setUser: (user) => set({ user, isAuthenticated: true, hasHydrated: true }),
  setToken: (token) => set({ token, hasHydrated: true }),

  login: (user, token, options = {}) => {
    const hasValidToken =
      typeof token === 'string' &&
      token.length > 0 &&
      token !== 'undefined' &&
      token !== 'null' &&
      !token.startsWith('mock')
    const hasValidUser = Boolean(user && typeof user === 'object' && user.username)

    if (!hasValidToken || !hasValidUser) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem(REMEMBER_ME_KEY)
      sessionStorage.removeItem(SESSION_AUTH_KEY)
      set({ user: null, token: null, isAuthenticated: false, hasHydrated: true })
      return
    }

    const remember = options?.remember
    if (remember === true) {
      localStorage.setItem(REMEMBER_ME_KEY, 'true')
      sessionStorage.setItem(SESSION_AUTH_KEY, '1')
    } else if (remember === false) {
      localStorage.setItem(REMEMBER_ME_KEY, 'false')
      sessionStorage.setItem(SESSION_AUTH_KEY, '1')
    }

    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true, hasHydrated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem(REMEMBER_ME_KEY)
    sessionStorage.removeItem(SESSION_AUTH_KEY)
    set({ user: null, token: null, isAuthenticated: false, hasHydrated: true })
  },

  // Load user từ localStorage khi app khởi động
  loadUser: () => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY)
    const hasSession = sessionStorage.getItem(SESSION_AUTH_KEY) === '1'

    // remember=false thì chỉ giữ phiên trong lifetime của tab/session hiện tại.
    if (rememberMe === 'false' && !hasSession) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem(REMEMBER_ME_KEY)
      sessionStorage.removeItem(SESSION_AUTH_KEY)
      set({ user: null, token: null, isAuthenticated: false, hasHydrated: true })
      return
    }

    const hasValidToken =
      typeof token === 'string' &&
      token.length > 0 &&
      token !== 'undefined' &&
      token !== 'null' &&
      !token.startsWith('mock')

    if (!hasValidToken || !userStr || userStr === 'undefined' || userStr === 'null') {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem(REMEMBER_ME_KEY)
      sessionStorage.removeItem(SESSION_AUTH_KEY)
      set({ user: null, token: null, isAuthenticated: false, hasHydrated: true })
      return
    }

    try {
      const user = JSON.parse(userStr)
      if (!user || typeof user !== 'object' || !user.username) {
        throw new Error('Invalid stored user object')
      }
      if (rememberMe === 'false') {
        sessionStorage.setItem(SESSION_AUTH_KEY, '1')
      }
      set({ user, token, isAuthenticated: true, hasHydrated: true })
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem(REMEMBER_ME_KEY)
      sessionStorage.removeItem(SESSION_AUTH_KEY)
      set({ user: null, token: null, isAuthenticated: false, hasHydrated: true })
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
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setTheme: (theme) => set({ theme }),
}))
