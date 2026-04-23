import axios from 'axios'
import { API_URL } from '../utils/constants'
import { useAuthStore } from '../store'

const isValidToken = (token) =>
  token && token !== 'undefined' && token !== 'null' && !token.startsWith('mock')

const clearAuthSession = () => {
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem('rememberMe')
    sessionStorage.removeItem('authSession')
    useAuthStore.getState().logout()
  } catch (_error) {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem('rememberMe')
    sessionStorage.removeItem('authSession')
  }
}

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
    const isAuthenticated = useAuthStore.getState().isAuthenticated
    const hasToken = typeof token === 'string' && token.length > 0

    if (isAuthenticated && isValidToken(token)) {
      config.headers.Authorization = `Bearer ${token}`
    } else if ((isAuthenticated && !isValidToken(token)) || (hasToken && !isValidToken(token))) {
      clearAuthSession()
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
        if (
          !refreshToken ||
          refreshToken === 'undefined' ||
          refreshToken === 'null' ||
          refreshToken.startsWith('mock')
        ) {
          throw new Error('Missing or invalid refresh token')
        }
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        })

        const payload = response.data?.data ?? response.data
        const token = payload?.token
        if (!isValidToken(token)) {
          throw new Error('Refresh response did not contain a valid token')
        }
        localStorage.setItem('token', token)
        if (payload?.refreshToken && payload.refreshToken !== refreshToken) {
          localStorage.setItem('refreshToken', payload.refreshToken)
        }

        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh token failed, logout user
        clearAuthSession()
        window.location.hash = '#/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

/**
 * API wrapper for real backend API calls.
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param {string} endpoint - API endpoint path
 * @param {*} data - Request data
 * @returns {Promise} API response
 */
export const apiCall = async (method, endpoint, data = null) => {
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
