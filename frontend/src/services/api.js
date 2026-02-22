import axios from 'axios'
import { API_URL, USE_MOCK } from '../utils/constants'

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Add token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle errors and refresh token
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        })

        const { token } = response.data
        localStorage.setItem('token', token)

        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh token failed, logout user
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

/**
 * Mock API responses for development
 * Enable/disable via VITE_USE_MOCK in .env file
 */
const mockAPI = {
  async login(credentials) {
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate network delay
    return {
      user: {
        id: 1,
        username: credentials.username,
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://i.pravatar.cc/150?img=1',
      },
      token: 'mock-jwt-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
    }
  },

  async register(userData) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return {
      user: {
        id: 2,
        username: userData.username,
        email: userData.email,
        displayName: userData.username,
        avatarUrl: 'https://i.pravatar.cc/150?img=2',
      },
      token: 'mock-jwt-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
    }
  },

  async getProfile() {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
      bio: 'Chess enthusiast',
      rating: 1500,
      gamesPlayed: 120,
      wins: 60,
      losses: 40,
      draws: 20,
    }
  },

  async getLeaderboard(params) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      data: Array.from({ length: 20 }, (_, i) => ({
        rank: i + 1,
        id: i + 1,
        username: `Player${i + 1}`,
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        rating: 2000 - i * 50,
        gamesPlayed: 100 + i * 10,
        winRate: 60 - i,
      })),
      total: 1000,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    }
  },

  async getRankedHistory() {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      data: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        opponent: {
          username: `Opponent${i + 1}`,
          rating: 1500 + i * 10,
        },
        result: ['win', 'loss', 'draw'][i % 3],
        eloChange: [24, -16, 0][i % 3],
        date: new Date(Date.now() - i * 86400000).toISOString(),
        duration: '15:30',
        mode: 'ranked',
      })),
    }
  },
}

/**
 * API wrapper that uses mock or real API based on config
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param {string} endpoint - API endpoint path
 * @param {*} data - Request data
 * @returns {Promise} API response
 */
export const apiCall = async (method, endpoint, data = null) => {
  if (USE_MOCK) {
    // Use mock data in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[MOCK API] ${method.toUpperCase()} ${endpoint}`, data)
    }
    
    // Route to appropriate mock function
    if (endpoint.includes('/auth/login')) return mockAPI.login(data)
    if (endpoint.includes('/auth/register')) return mockAPI.register(data)
    if (endpoint.includes('/users/profile')) return mockAPI.getProfile()
    if (endpoint.includes('/users/leaderboard')) return mockAPI.getLeaderboard(data)
    if (endpoint.includes('/ranked/history')) return mockAPI.getRankedHistory()
    
    // Default mock response
    return { message: 'Mock API response', data }
  }

  // Use real API
  switch (method.toLowerCase()) {
    case 'get':
      return api.get(endpoint, { params: data })
    case 'post':
      return api.post(endpoint, data)
    case 'put':
      return api.put(endpoint, data)
    case 'patch':
      return api.patch(endpoint, data)
    case 'delete':
      return api.delete(endpoint, { data })
    default:
      throw new Error(`Unsupported method: ${method}`)
  }
}

export default api
