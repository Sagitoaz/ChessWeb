import { create } from 'zustand'

const REMEMBER_ME_KEY = 'rememberMe'
const SESSION_AUTH_KEY = 'authSession'
const clearSessionMarkers = () => {
  localStorage.removeItem(REMEMBER_ME_KEY)
  sessionStorage.removeItem(SESSION_AUTH_KEY)
}

const writeSessionMarkers = (remember) => {
  localStorage.setItem(REMEMBER_ME_KEY, remember === false ? 'false' : 'true')
  sessionStorage.setItem(SESSION_AUTH_KEY, '1')
}

/**
 * Auth Store - Quản lý state authentication
 */
export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  hasHydrated: false,

  beginHydration: () => set({ hasHydrated: false }),
  setHydrated: (value = true) => set({ hasHydrated: Boolean(value) }),
  setUser: (user) =>
    set((state) => ({
      user,
      isAuthenticated: Boolean(user && state.token),
      hasHydrated: true,
    })),
  setToken: (token) =>
    set((state) => ({
      token,
      isAuthenticated: Boolean(state.user && token),
      hasHydrated: true,
    })),

  login: (user, token, options = {}) => {
    const hasValidToken =
      typeof token === 'string' &&
      token.length > 0 &&
      token !== 'undefined' &&
      token !== 'null' &&
      !token.startsWith('mock')
    const hasValidUser = Boolean(user && typeof user === 'object' && user.username)

    if (!hasValidToken || !hasValidUser) {
      clearSessionMarkers()
      set({ user: null, token: null, isAuthenticated: false, hasHydrated: true })
      return
    }

    if (Object.prototype.hasOwnProperty.call(options || {}, 'remember')) {
      writeSessionMarkers(options?.remember)
    }

    set({ user, token, isAuthenticated: true, hasHydrated: true })
  },

  logout: () => {
    clearSessionMarkers()
    set({ user: null, token: null, isAuthenticated: false, hasHydrated: true })
  },

  // Chỉ kiểm tra marker phiên; việc khôi phục token thật sẽ do authService.restoreSession đảm nhiệm.
  loadUser: () => {
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY)
    const hasSession = sessionStorage.getItem(SESSION_AUTH_KEY) === '1'

    if (rememberMe === 'false' && !hasSession) {
      clearSessionMarkers()
      set({ user: null, token: null, isAuthenticated: false, hasHydrated: true })
      return
    }

    set((state) => ({
      ...state,
      hasHydrated: true,
    }))
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
